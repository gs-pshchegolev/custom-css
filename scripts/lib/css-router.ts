/**
 * CSS Anchor Router
 * 
 * Parses CSS and routes rules to files based on data-css-anchor selectors.
 * 
 * Routing logic:
 * - Single anchor → src/widgets/{anchor}.css
 * - No anchor or multiple anchors → src/common/global.css
 * - Parse errors → src/quarantine.css
 */

import postcss, { Root, Rule, AtRule, Comment, Node } from 'postcss';

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
 * Parse and route a CSS bundle into separate files
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
  
  // Process each top-level node
  root.nodes?.forEach((node) => {
    try {
      if (node.type === 'rule') {
        // Regular CSS rule - route based on selectors
        const rule = node as Rule;
        const selectors = rule.selector.split(',').map(s => s.trim());
        const route = routeSelectors(selectors);
        const filePath = getFilePath(route);
        addToFile(filePath, nodeToString(node));
        
      } else if (node.type === 'atrule') {
        // At-rule (@media, @keyframes, etc.)
        const atRule = node as AtRule;
        
        if (atRule.name === 'media' || atRule.name === 'supports') {
          // For @media/@supports, we need to look inside for anchors
          // Route based on the rules inside
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
          // Other at-rules (@keyframes, @font-face, etc.) → global
          addToFile(getFilePath({ type: 'global' }), nodeToString(node));
        }
        
      } else if (node.type === 'comment') {
        // Preserve comments - attach to global unless it's a banner
        const comment = node as Comment;
        const text = comment.text.trim();
        
        // Skip banner comments (typically at top of file)
        if (!text.startsWith('!') && !text.includes('Version:')) {
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
