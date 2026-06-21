import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase/firestore') || id.includes('@firebase/firestore')) return 'firebase-firestore';
            if (id.includes('firebase/auth')      || id.includes('@firebase/auth'))      return 'firebase-auth';
            if (id.includes('firebase')           || id.includes('@firebase'))           return 'firebase-core';
            if (id.includes('framer-motion'))     return 'framer-motion';
            if (id.includes('@radix-ui'))         return 'radix-ui';
            if (id.includes('@tiptap') || id.includes('prosemirror')) return 'tiptap';
            if (id.includes('react-router'))      return 'router';
            if (id.includes('react-dom'))         return 'react-dom';
            if (id.includes('react'))             return 'react';
          }
        },
      },
    },
  },
});
