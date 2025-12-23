/**
 * Shared Configuration
 * 
 * Central configuration for the CSS round-trip build system.
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Resolve root directory - go up from scripts/lib to project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const ROOT_DIR = resolve(__dirname, '../..');

// Input configuration (for unbundling)
export const INPUT_DIR = resolve(ROOT_DIR, 'input');
export const INPUT_BUNDLE_PATH = resolve(INPUT_DIR, 'platform-bundle.css');

// Output configuration (build output)
export const OUTPUT_DIR = resolve(ROOT_DIR, 'dist');
export const BUNDLE_NAME = 'platform-bundle';
export const OUTPUT_BUNDLE_PATH = resolve(OUTPUT_DIR, `${BUNDLE_NAME}.css`);

// Source configuration
export const SRC_DIR = resolve(ROOT_DIR, 'src');
export const ENTRY_FILE = resolve(SRC_DIR, 'main.css');
export const QUARANTINE_PATH = resolve(SRC_DIR, 'quarantine.css');

// Build metadata
export const BUILD_META = {
  version: process.env.npm_package_version || '1.0.0',
  author: 'Your Company Name',
  get buildDate() {
    return new Date().toISOString();
  }
};

/**
 * Generates the bundle banner text
 */
export function generateBanner(): string {
  return `/*!
 * Custom Platform Styles
 * Version: ${BUILD_META.version}
 * Author: ${BUILD_META.author}
 * Build Date: ${BUILD_META.buildDate}
 */`;
}
