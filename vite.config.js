import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    // Required for @solana/web3.js — polyfills Buffer, process, crypto in browser
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['@solana/web3.js', '@solana/spl-token'],
    esbuildOptions: { target: 'esnext' },
  },
  build: {
    target: 'esnext',
  },
});
