import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from "vite";

// Custom plugin for cache headers and MIME types
const cacheHeadersPlugin = (): Plugin => ({
  name: 'cache-headers',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url || '';
      
      // Security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Set correct MIME types for JavaScript modules
      if (url.match(/\.(js|mjs|jsx|ts|tsx)$/)) {
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // CSS files
      else if (url.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // Fonts
      else if (url.match(/\.(woff2?|ttf|otf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // Images
      else if (url.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // Short cache for HTML
      else if (url.endsWith('.html') || url === '/') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
      }
      // API routes - no cache
      else if (url.startsWith('/api/') || url.includes('supabase')) {
        res.setHeader('Cache-Control', 'no-store, private');
      }
      
      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    mode === 'development' && cacheHeadersPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    target: 'es2020',
    supported: {
      'top-level-await': true
    },
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    modulePreload: true,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Hash all assets for immutable cache
        assetFileNames: 'assets/[name].[hash][extname]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: mode === 'production' ? false : true,
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
    },
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
    ],
  },
}));
