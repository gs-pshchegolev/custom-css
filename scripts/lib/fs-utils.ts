/**
 * File System Utilities
 * 
 * Common file operations with safety features.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

/**
 * Ensures a directory exists, creating it recursively if needed
 */
export function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
}

/**
 * Writes content to a file, creating directories as needed
 */
export function writeFileSafe(filePath: string, content: string): void {
  ensureDir(filePath);
  writeFileSync(filePath, content, 'utf8');
}

/**
 * Reads a file and returns its content, or null if it doesn't exist
 */
export function readFileSafe(filePath: string): string | null {
  if (!existsSync(filePath)) {
    return null;
  }
  return readFileSync(filePath, 'utf8');
}

/**
 * Checks if a file exists
 */
export { existsSync as fileExists } from 'fs';
