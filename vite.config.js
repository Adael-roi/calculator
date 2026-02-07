import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split mathjs into its own chunk
          'mathjs': ['mathjs'],
          // Split decimal.js into its own chunk
          'decimal': ['decimal.js']
        }
      }
    },
    chunkSizeWarningLimit: 700 // Increase limit slightly since mathjs is large
  },
  worker: {
    format: 'es'
  }
});
