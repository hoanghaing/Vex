import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// `vite build --mode es`  → ESM (three/vue external); types via tsc -p tsconfig.build.json
// `vite build --mode umd` → standalone UMD with three bundled
export default defineConfig(({ mode }) => {
  if (mode === 'umd') {
    return {
      build: {
        emptyOutDir: false,
        lib: {
          entry: resolve(__dirname, 'src/index.ts'),
          name: 'VendingMachine3D',
          formats: ['umd'],
          fileName: () => 'vending-machine-3d.umd.js',
        },
      },
    };
  }
  return {
    build: {
      emptyOutDir: true,
      lib: {
        entry: { index: resolve(__dirname, 'src/index.ts'), vue: resolve(__dirname, 'src/vue/index.ts') },
        formats: ['es'],
        fileName: (_f, name) => `${name}.js`,
      },
      rollupOptions: { external: [/^three(\/.*)?$/, 'vue'] },
    },
  };
});
