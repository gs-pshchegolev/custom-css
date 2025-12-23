/**
 * Vite Plugin: CSS File Markers
 * 
 * Injects file boundary markers into the bundled CSS for reliable unbundling.
 * 
 * Marker format: /* @file: src/by-css-anchor/header.css *​/
 * 
 * Works by intercepting @import resolution and prepending markers to each file.
 */

import type { Plugin } from 'vite';
import { resolve, relative, dirname } from 'path';
import { readFileSync, existsSync } from 'fs';
import { ROOT_DIR, SRC_DIR } from '../lib/config';

/** Marker comment format */
export const MARKER_PREFIX = "/* @file:";
export const MARKER_SUFFIX = "*/";

/** Regex to match and capture file markers (for splitting bundles) */
export const FILE_MARKER_REGEX = /\/\*\s*@file:\s*([^\s*]+)\s*\*\//g;
/**
 * Generate a file marker comment
 */
export function createFileMarker(filePath: string): string {
  const relativePath = relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  return `${MARKER_PREFIX} ${relativePath} ${MARKER_SUFFIX}`;
}

/**
 * Recursively resolve @import statements and add file markers
 */
function resolveImports(filePath: string, visited = new Set<string>()): string {
  // Prevent circular imports
  if (visited.has(filePath)) {
    return `/* Circular import: ${filePath} */\n`;
  }
  visited.add(filePath);
  
  if (!existsSync(filePath)) {
    return `/* File not found: ${filePath} */\n`;
  }
  
  const content = readFileSync(filePath, 'utf8');
  const dir = dirname(filePath);
  const marker = createFileMarker(filePath);
  
  // Check if file has any @import statements
  const importRegex = /@import\s+["']([^"']+)["']\s*;?/g;
  const hasImports = importRegex.test(content);
  importRegex.lastIndex = 0; // Reset regex state
  
  // If no imports, just return the file with marker
  if (!hasImports) {
    return `${marker}\n${content}\n`;
  }
  
  // Process @import statements
  let result = '';
  let lastIndex = 0;
  let match;
  let hasContentBeforeImports = false;
  
  while ((match = importRegex.exec(content)) !== null) {
    // Check for content before this import (excluding comments/whitespace)
    const beforeImport = content.slice(lastIndex, match.index).trim();
    if (beforeImport && !beforeImport.startsWith('/*')) {
      // Non-comment content before imports - add with marker
      if (!hasContentBeforeImports) {
        result += `${marker}\n`;
        hasContentBeforeImports = true;
      }
      result += beforeImport + '\n';
    }
    
    // Resolve the imported file
    const importPath = match[1];
    const resolvedPath = resolve(dir, importPath);
    
    // Recursively process the imported file
    result += resolveImports(resolvedPath, visited);
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining content after last import
  const afterImports = content.slice(lastIndex).trim();
  if (afterImports) {
    // If there's content after imports, it belongs to this file
    result += `${marker}\n${afterImports}\n`;
  }
  
  return result;
}

export function cssFileMarkersPlugin(): Plugin {
  return {
    name: 'css-file-markers',
    enforce: 'pre',
    apply: 'build',  // Only run during build, not dev server
    
    // Intercept the entry CSS file and manually resolve all imports
    load(id) {
      // Only process CSS files in src directory
      if (!id.endsWith('.css') || !id.startsWith(SRC_DIR)) return null;
      
      // Only process entry file (main.css), let Vite handle the resolved output
      if (!id.endsWith('main.css')) return null;
      
      const result = resolveImports(id);
      return result;
    }
  };
}
