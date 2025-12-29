#!/usr/bin/env npx tsx

/**
 * Unbundle Script
 * 
 * Reads the bundled CSS file and splits it back into source files
 * based on file markers injected during build.
 * 
 * Marker format: /* 📁 @file: src/path/file.css — ⛔ Keep this comment *​/
 * 
 * Usage: npm run unbundle
 */

import { join } from 'path';
import { readFileSync } from 'fs';
import {
  ROOT_DIR,
  INPUT_BUNDLE_PATH,
  INPUT_DIR,
  QUARANTINE_PATH,
  writeFileSafe,
  fileExists,
} from "./lib";
import { FILE_MARKER_TOKEN, parseFileMarker } from "./plugins/css-file-markers";

/** Regex to match file marker comments (single line) */
const MARKER_COMMENT_REGEX = /\/\*\s*📁\s*@file:[^*]*\*\//g;

/**
 * Parse bundle by file markers
 */
function parseByMarkers(bundleContent: string): Map<string, string> {
  const files = new Map<string, string>();
  
  // Find all file marker comments
  const markerPositions: { path: string; start: number; end: number }[] = [];
  
  let match;
  while ((match = MARKER_COMMENT_REGEX.exec(bundleContent)) !== null) {
    const comment = match[0];
    const path = parseFileMarker(comment);
    if (path) {
      markerPositions.push({
        path,
        start: match.index,
        end: match.index + comment.length
      });
    }
  }
  
  // Extract content between markers
  for (let i = 0; i < markerPositions.length; i++) {
    const current = markerPositions[i];
    const next = markerPositions[i + 1];
    
    const contentStart = current.end;
    const contentEnd = next ? next.start : bundleContent.length;
    const content = bundleContent.slice(contentStart, contentEnd).trim();
    
    if (current.path) {
      // Include file even if empty (preserves structure)
      files.set(current.path, content ? content + "\n" : "");
    }
  }

  return files;
}

/**
 * Generate quarantine file header
 */
function generateQuarantineHeader(): string {
  return `/**
 * ⚠️ QUARANTINE FILE
 * 
 * This file contains CSS code that could not be parsed or routed.
 * 
 * Extracted on: ${new Date().toISOString()}
 * 
 * Please review this code and either:
 * 1. Fix any syntax errors and move to the appropriate source file
 * 2. Delete it if it's no longer needed
 */

`;
}

/**
 * Main unbundle function
 */
function unbundle(): void {
  console.log("🔄 Starting unbundle process...\n");

  // Check if bundle exists
  if (!fileExists(INPUT_BUNDLE_PATH)) {
    console.error(`❌ Bundle not found at: ${INPUT_BUNDLE_PATH}`);
    console.error(`\n   Place the CSS bundle from the community in:`);
    console.error(`   📁 ${INPUT_DIR}/platform-bundle.css`);
    process.exit(1);
  }

  // Read the bundle
  const bundleContent = readFileSync(INPUT_BUNDLE_PATH, "utf8");
  console.log(`📖 Read bundle: ${INPUT_BUNDLE_PATH}`);
  console.log(`   Size: ${bundleContent.length} bytes\n`);

  // Check for file markers
  const hasMarkers = bundleContent.includes(FILE_MARKER_TOKEN);

  if (!hasMarkers) {
    console.error("❌ No file markers found in bundle!");
    console.error(
      "   The bundle must be created with `npm run build` to include markers."
    );
    console.error(
      "   If this is an external bundle, file markers are required for unbundling."
    );
    process.exit(1);
  }

  // Parse by file markers
  const files = parseByMarkers(bundleContent);

  // Collect file paths for main.css generation
  const importPaths: string[] = [];

  // Write files
  let updatedCount = 0;
  let anchorCount = 0;

  for (const [filePath, content] of files) {
    // Collect paths for main.css (excluding main.css itself)
    if (filePath !== "src/main.css" && filePath.startsWith("src/")) {
      // Convert to relative import path from main.css perspective
      const importPath = "./" + filePath.replace("src/", "");
      importPaths.push(importPath);
    }

    const fullPath = join(ROOT_DIR, filePath);
    writeFileSafe(fullPath, content);

    if (filePath.startsWith("src/by-css-anchor/")) {
      anchorCount++;
      console.log(`✅ Anchor: ${filePath}`);
    } else {
      console.log(`✅ Updated: ${filePath}`);
    }
    updatedCount++;
  }

  // Generate main.css with @import statements
  if (importPaths.length > 0) {
    const mainCssContent = importPaths
      .map(p => `@import "${p}";`)
      .join("\n") + "\n";
    const mainCssPath = join(ROOT_DIR, "src/main.css");
    writeFileSafe(mainCssPath, mainCssContent);
    console.log(`✅ Generated: src/main.css (${importPaths.length} imports)`);
  }

  console.log(`\n📝 Updated ${updatedCount} file(s) (${anchorCount} anchors)`);
  console.log("\n🎉 Unbundle complete!");
}

// Run the script
unbundle();
