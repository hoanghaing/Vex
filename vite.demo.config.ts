import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

export default defineConfig({
  root: 'demo',
  base: './',
  plugins: [vue()],
  build: {
    outDir: resolve(__dirname, 'demo-dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'demo/index.html'),
        vanilla: resolve(__dirname, 'demo/vanilla.html'),
      },
    },
  },
});
