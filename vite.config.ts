import { defineConfig } from 'vite';
import { ENTRY_FILE, generateBanner } from './scripts/lib';
import { removeEmptyCssPlugin } from './scripts/plugins/remove-empty-css';

export default defineConfig({
  server: {
    host: true,   // Expose to network for port forwarding
    cors: true    // Allow cross-origin requests from external platform
  },
  
  plugins: [
    removeEmptyCssPlugin()  // Strip files with no CSS rules from bundle
  ],

  build: {
    sourcemap: true,      // Enable source maps for traceability
    minify: false,        // Keep CSS readable
    cssMinify: false,
    emptyOutDir: true,    // Clean dist/ before building

    rollupOptions: {
      input: {
        'platform-bundle': ENTRY_FILE,
      },
      output: {
        banner: generateBanner(),       // Inject version header
        entryFileNames: '[name].js',    // No hash, flat structure
        assetFileNames: '[name].[ext]',
      }
    }
  }
});
