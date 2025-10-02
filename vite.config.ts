import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from "vite";

// Custom plugin for cache headers
const cacheHeadersPlugin = (): Plugin => ({
  name: 'cache-headers',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url || '';
      
      // Long-term cache for static assets (JS, CSS, images)
      if (url.match(/\.(js|css|woff2?|ttf|otf|eot|svg|png|jpg|jpeg|gif|webp|ico)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // Short cache for HTML
      else if (url.endsWith('.html') || url === '/') {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      }
      // API routes - no cache
      else if (url.startsWith('/api/') || url.includes('supabase')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
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
  build: {
    // Optimize build output
    target: 'esnext',
    minify: 'esbuild', // Using esbuild (faster and built-in)
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    // Code splitting optimization
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            // Other node_modules
            return 'vendor';
          }
          
          // Split pages by domain
          if (id.includes('/pages/')) {
            if (id.includes('/enseignants/')) return 'pages-enseignants';
            if (id.includes('/eleves/')) return 'pages-eleves';
            if (id.includes('/classes/')) return 'pages-classes';
            if (id.includes('/examens/')) return 'pages-examens';
            if (id.includes('/notes/')) return 'pages-notes';
            if (id.includes('/resultats/')) return 'pages-resultats';
            if (id.includes('/emplois/')) return 'pages-emplois';
            if (id.includes('/paiements/')) return 'pages-paiements';
            if (id.includes('/admin/')) return 'pages-admin';
          }
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting - each route gets its own CSS
    cssCodeSplit: true,
    // Optimize CSS output
    cssMinify: 'lightningcss',
    // Source maps for production debugging
    sourcemap: mode === 'production' ? false : true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'lucide-react',
    ],
    exclude: ['@vite/client', '@vite/env'],
  },
}));
