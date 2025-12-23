import { defineConfig } from 'vite';
import { ENTRY_FILE, generateBanner } from './scripts/lib';

export default defineConfig({
  server: {
    // Expose to network (required for port forwarding)
    host: true,
    // Allow cross-origin requests (required for external platform)
    cors: true
  },
  
  build: {
    // Enable Source Maps for traceability
    sourcemap: true,
    
    // Do not minify - keep CSS readable
    minify: false,
    cssMinify: false,
    
    // Clean the folder before building
    emptyOutDir: true,

    rollupOptions: {
      input: {
        'platform-bundle': ENTRY_FILE,
      },

      output: {
        // Inject the banner header
        banner: generateBanner(),

        // Fixed filenames (no hashing)
        entryFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      }
    }
  }
});
