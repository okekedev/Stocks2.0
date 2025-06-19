import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Base public path for deployment
  base: './',
  
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Generate manifest for better caching
    manifest: true,
    // Optimize for production
    minify: 'terser',
    // Source maps for debugging (optional)
    sourcemap: false,
    // Rollup options
    rollupOptions: {
      output: {
        // Better chunking for caching
        manualChunks: undefined,
      }
    }
  },
  
  // Server configuration for development
  server: {
    port: 3000,
    host: true, // Allow external connections (useful for containers)
    strictPort: true,
  },
  
  // Preview server configuration
  preview: {
    port: 3000,
    host: '0.0.0.0', // Allow external connections for containers
    strictPort: true,
  }
})