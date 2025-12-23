/**
 * Manifest Sync Utility
 * 
 * Compares main.css imports with actual files in src/ directory.
 * Detects missing imports and orphaned references.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { ROOT_DIR, SRC_DIR } from './config';

const MAIN_CSS_PATH = join(SRC_DIR, 'main.css');
const ANCHORS_DIR = join(SRC_DIR, 'by-css-anchor');
const COMMON_DIR = join(SRC_DIR, 'common');

/** Regex to extract @import paths */
const IMPORT_REGEX = /@import\s+["']([^"']+)["']/g;

/** Result of manifest sync check */
export interface ManifestSyncResult {
  /** Files in manifest that exist */
  valid: string[];
  /** Files on disk but not in manifest */
  missing: string[];
  /** Files in manifest but not on disk */
  orphaned: string[];
  /** Whether manifest is in sync */
  inSync: boolean;
}

/**
 * Parse imports from main.css
 */
export function parseManifestImports(): string[] {
  if (!existsSync(MAIN_CSS_PATH)) {
    return [];
  }
  
  const content = readFileSync(MAIN_CSS_PATH, 'utf8');
  const imports: string[] = [];
  
  for (const match of content.matchAll(IMPORT_REGEX)) {
    imports.push(match[1]);
  }
  
  return imports;
}

/**
 * Get all CSS files in a directory
 */
function getCssFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  
  return readdirSync(dir)
    .filter(f => f.endsWith('.css'))
    .map(f => join(dir, f));
}

/**
 * Get all source CSS files (common + by-css-anchor)
 */
export function getSourceFiles(): string[] {
  const commonFiles = getCssFiles(COMMON_DIR);
  const anchorFiles = getCssFiles(ANCHORS_DIR);
  return [...commonFiles, ...anchorFiles];
}

/**
 * Convert absolute path to relative import path (for main.css)
 */
export function toImportPath(absolutePath: string): string {
  const relativePath = relative(SRC_DIR, absolutePath);
  return './' + relativePath;
}

/**
 * Convert relative import path to absolute path
 */
export function toAbsolutePath(importPath: string): string {
  // Remove leading ./
  const cleaned = importPath.replace(/^\.\//, '');
  return join(SRC_DIR, cleaned);
}

/**
 * Check if manifest is in sync with filesystem
 */
export function checkManifestSync(): ManifestSyncResult {
  const imports = parseManifestImports();
  const sourceFiles = getSourceFiles();
  
  // Convert to sets for comparison
  const importedPaths = new Set(imports.map(toAbsolutePath));
  const existingPaths = new Set(sourceFiles);
  
  const valid: string[] = [];
  const missing: string[] = [];
  const orphaned: string[] = [];
  
  // Check each imported file
  for (const imp of imports) {
    const absPath = toAbsolutePath(imp);
    if (existingPaths.has(absPath)) {
      valid.push(imp);
    } else {
      orphaned.push(imp);
    }
  }
  
  // Check for files not in manifest
  for (const filePath of sourceFiles) {
    if (!importedPaths.has(filePath)) {
      missing.push(toImportPath(filePath));
    }
  }
  
  return {
    valid,
    missing,
    orphaned,
    inSync: missing.length === 0 && orphaned.length === 0
  };
}

/**
 * Generate updated main.css content with missing imports added
 */
export function generateUpdatedManifest(addImports: string[]): string {
  const content = existsSync(MAIN_CSS_PATH) 
    ? readFileSync(MAIN_CSS_PATH, 'utf8')
    : '/* CSS Manifest */\n';
  
  // Add new imports at the end
  const newImports = addImports
    .map(imp => `@import "${imp}";`)
    .join('\n');
  
  return content.trimEnd() + '\n' + newImports + '\n';
}
