#!/usr/bin/env npx tsx

/**
 * Unbundle Script
 * 
 * Reads the bundled CSS file and routes rules to source files
 * based on data-css-anchor selectors.
 * 
 * Routing logic:
 * - Single anchor → src/by-css-anchor/{anchor}.css
 * - No anchor or multiple anchors → src/common/global.css
 * - Parse errors → src/quarantine.css
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
  routeBundle,
  formatFileContent
} from './lib';

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
  console.log('🔄 Starting unbundle process...\n');
  
  // Check if bundle exists
  if (!fileExists(INPUT_BUNDLE_PATH)) {
    console.error(`❌ Bundle not found at: ${INPUT_BUNDLE_PATH}`);
    console.error(`\n   Place the CSS bundle from the community in:`);
    console.error(`   📁 ${INPUT_DIR}/platform-bundle.css`);
    process.exit(1);
  }
  
  // Read the bundle
  const bundleContent = readFileSync(INPUT_BUNDLE_PATH, 'utf8');
  console.log(`📖 Read bundle: ${INPUT_BUNDLE_PATH}`);
  console.log(`   Size: ${bundleContent.length} bytes\n`);
  
  // Route the CSS rules
  const { files, quarantine, errors } = routeBundle(bundleContent);
  
  // Report any parsing errors
  if (errors.length > 0) {
    console.log('⚠️  Parsing warnings:');
    errors.forEach(err => console.log(`   ${err}`));
    console.log('');
  }
  
  // Write routed files
  let updatedCount = 0;
  const anchorCount = { count: 0 };
  
  for (const [filePath, rules] of files) {
    const fullPath = join(ROOT_DIR, filePath);
    const content = formatFileContent(rules);
    writeFileSafe(fullPath, content);
    
    if (filePath.startsWith('src/by-css-anchor/')) {
      anchorCount.count++;
      console.log(`✅ Anchor: ${filePath}`);
    } else {
      console.log(`✅ Updated: ${filePath}`);
    }
    updatedCount++;
  }
  
  console.log(`\n📝 Updated ${updatedCount} file(s) (${anchorCount.count} anchors)`);
  
  // Handle quarantined CSS
  if (quarantine.length > 0) {
    const quarantineContent = generateQuarantineHeader() + quarantine.join('\n\n') + '\n';
    writeFileSafe(QUARANTINE_PATH, quarantineContent);
    console.log(`\n⚠️  Some CSS couldn't be parsed! Saved to: src/quarantine.css`);
  } else {
    console.log('\n✨ All CSS successfully routed');
  }
  
  console.log('\n💡 Run "npm run sync" to check main.css imports');
  console.log('\n🎉 Unbundle complete!');
}

// Run the script
unbundle();
