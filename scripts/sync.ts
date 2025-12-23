#!/usr/bin/env npx tsx

/**
 * Sync Manifest Script
 * 
 * Synchronizes main.css imports with actual files in src/ directory.
 * 
 * Usage:
 *   npm run sync          # Check only, report mismatches
 *   npm run sync -- --fix # Auto-add missing imports to main.css
 */

import { join } from 'path';
import { writeFileSync } from 'fs';
import {
  SRC_DIR,
  checkManifestSync,
  generateUpdatedManifest
} from './lib';

const FIX_FLAG = process.argv.includes('--fix');

/**
 * Main sync function
 */
function sync(): void {
  console.log('📋 Checking main.css manifest...\n');
  
  const syncResult = checkManifestSync();
  
  if (syncResult.inSync) {
    console.log('✨ Manifest is in sync with source files');
    console.log(`   ${syncResult.valid.length} imports OK`);
    return;
  }
  
  // Report missing imports
  if (syncResult.missing.length > 0) {
    console.log(`⚠️  Files not imported in main.css (${syncResult.missing.length}):`);
    syncResult.missing.forEach(f => console.log(`   + ${f}`));
    
    if (FIX_FLAG) {
      const mainCssPath = join(SRC_DIR, 'main.css');
      const updatedContent = generateUpdatedManifest(syncResult.missing);
      writeFileSync(mainCssPath, updatedContent, 'utf8');
      console.log('\n✅ Added missing imports to main.css');
    } else {
      console.log('\n   Run with --fix to auto-add them:');
      console.log('   npm run sync -- --fix');
    }
  }
  
  // Report orphaned imports
  if (syncResult.orphaned.length > 0) {
    console.log(`\n⚠️  Imports in main.css but file not found (${syncResult.orphaned.length}):`);
    syncResult.orphaned.forEach(f => console.log(`   - ${f}`));
    console.log('   Please remove these manually from main.css');
  }
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Valid: ${syncResult.valid.length}`);
  console.log(`   Missing: ${syncResult.missing.length}`);
  console.log(`   Orphaned: ${syncResult.orphaned.length}`);
}

// Run the script
sync();
