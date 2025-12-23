/**
 * CSS Router
 * 
 * Parses CSS bundles and routes content back to source files.
 * 
 * Primary routing: File markers (/* @file: path *​/)
 * Fallback routing: data-css-anchor selectors
 * 
 * Routing logic for unmarked content:
 * - Single anchor → src/by-css-anchor/{anchor}.css
 * - No anchor or multiple anchors → src/common/global.css
 * - Parse errors → src/quarantine.css
 */

import postcss, { Root, Rule, AtRule, Comment, Node } from 'postcss';

/** File marker prefix */
const FILE_MARKER_PREFIX = '@file:';

/** Regex to extract data-css-anchor values from selectors */
const ANCHOR_REGEX = /\[data-css-anchor=["']([^"']+)["']\]/g;

/** Route types for CSS rules */
export type RouteType = 'widget' | 'global' | 'quarantine';

/** Routing result for a CSS rule */
export interface RouteResult {
  type: RouteType;
  /** Widget name (only when type === 'widget') */
  widgetName?: string;
}

/** A CSS rule with its routing destination */
export interface RoutedRule {
  /** The original CSS text */
  css: string;
  /** Where this rule should go */
  route: RouteResult;
}

/** Result of parsing and routing a CSS bundle */
export interface RoutedBundle {
  /** Rules grouped by destination file */
  files: Map<string, string[]>;
  /** Any CSS that couldn't be parsed */
  quarantine: string[];
  /** Parsing errors encountered */
  errors: string[];
}

/**
 * Extract all data-css-anchor values from a selector string
 */
export function extractAnchors(selector: string): Set<string> {
  const anchors = new Set<string>();
  for (const match of selector.matchAll(ANCHOR_REGEX)) {
    anchors.add(match[1]);
  }
  return anchors;
}

/**
 * Determine the route for a CSS rule based on its selectors
 */
export function routeSelectors(selectors: string[]): RouteResult {
  const allAnchors = new Set<string>();
  
  for (const selector of selectors) {
    const anchors = extractAnchors(selector);
    for (const anchor of anchors) {
      allAnchors.add(anchor);
    }
  }
  
  // Exactly one anchor → widget file
  if (allAnchors.size === 1) {
    return { type: 'widget', widgetName: [...allAnchors][0] };
  }
  
  // No anchors or multiple anchors → global
  return { type: 'global' };
}

/**
 * Get the file path for a route result
 */
export function getFilePath(route: RouteResult): string {
  switch (route.type) {
    case 'widget':
      return `src/by-css-anchor/${route.widgetName}.css`;
    case 'global':
      return 'src/common/global.css';
    case 'quarantine':
      return 'src/quarantine.css';
  }
}

/**
 * Convert a PostCSS node back to CSS string
 */
function nodeToString(node: Node): string {
  return node.toString();
}

/**
 * Check if a comment is a file marker
 */
function isFileMarker(text: string): boolean {
  return text.trim().startsWith(FILE_MARKER_PREFIX);
}

/**
 * Extract file path from a file marker comment
 */
function parseFileMarker(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith(FILE_MARKER_PREFIX)) return null;
  return trimmed.slice(FILE_MARKER_PREFIX.length).trim() || null;
}

/**
 * Parse and route a CSS bundle into separate files.
 * 
 * Uses file markers (/* @file: path *​/) as primary routing.
 * Falls back to anchor-based routing for unmarked content.
 */
export function routeBundle(cssContent: string): RoutedBundle {
  const files = new Map<string, string[]>();
  const quarantine: string[] = [];
  const errors: string[] = [];
  
  // Helper to add CSS to a file
  const addToFile = (filePath: string, css: string) => {
    if (!files.has(filePath)) {
      files.set(filePath, []);
    }
    files.get(filePath)!.push(css);
  };
  
  let root: Root;
  try {
    root = postcss.parse(cssContent);
  } catch (err) {
    errors.push(`Failed to parse CSS: ${err}`);
    quarantine.push(cssContent);
    return { files, quarantine, errors };
  }
  
  // Track current file from markers
  let currentFile: string | null = null;
  
  // Process each top-level node
  root.nodes?.forEach((node) => {
    try {
      // Check for file markers
      if (node.type === 'comment') {
        const comment = node as Comment;
        const markerPath = parseFileMarker(comment.text);
        
        if (markerPath) {
          // File marker found - switch to this file
          currentFile = markerPath;
          return; // Don't output the marker itself
        }
        
        // Regular comment - skip banners, route others
        const text = comment.text.trim();
        if (text.startsWith('!') || text.includes('Version:')) {
          return; // Skip banner comments
        }
        
        // Route comment to current file or global
        const targetFile = currentFile || getFilePath({ type: 'global' });
        addToFile(targetFile, nodeToString(node));
        return;
      }
      
      // For rules and at-rules, use marker-based routing if available
      if (currentFile) {
        addToFile(currentFile, nodeToString(node));
        return;
      }
      
      // Fallback: anchor-based routing for unmarked content
      if (node.type === 'rule') {
        const rule = node as Rule;
        const selectors = rule.selector.split(',').map(s => s.trim());
        const route = routeSelectors(selectors);
        addToFile(getFilePath(route), nodeToString(node));
        
      } else if (node.type === 'atrule') {
        const atRule = node as AtRule;
        
        if (atRule.name === 'media' || atRule.name === 'supports') {
          // Route based on anchors inside
          const innerAnchors = new Set<string>();
          
          atRule.walkRules((innerRule) => {
            const selectors = innerRule.selector.split(',').map(s => s.trim());
            for (const sel of selectors) {
              for (const anchor of extractAnchors(sel)) {
                innerAnchors.add(anchor);
              }
            }
          });
          
          let route: RouteResult;
          if (innerAnchors.size === 1) {
            route = { type: 'widget', widgetName: [...innerAnchors][0] };
          } else {
            route = { type: 'global' };
          }
          
          addToFile(getFilePath(route), nodeToString(node));
          
        } else {
          // Other at-rules → global
          addToFile(getFilePath({ type: 'global' }), nodeToString(node));
        }
        
      } else {
        // Unknown node type → global
        addToFile(getFilePath({ type: 'global' }), nodeToString(node));
      }
      
    } catch (err) {
      errors.push(`Error processing node: ${err}`);
      quarantine.push(nodeToString(node));
    }
  });
  
  return { files, quarantine, errors };
}

/**
 * Format the CSS content for a file (join rules with newlines)
 */
export function formatFileContent(rules: string[]): string {
  return rules.join('\n\n') + '\n';
}
