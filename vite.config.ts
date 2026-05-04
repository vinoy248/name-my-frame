import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'path'

export default defineConfig(({ mode }) => {
  if (mode === 'code') {
    return {
      build: {
        lib: {
          entry: path.resolve(__dirname, 'src/code.ts'),
          formats: ['iife'],
          name: 'PluginCode',
          fileName: () => 'code.js',
        },
        outDir: 'dist',
        emptyOutDir: false,
        minify: false,
        target: 'es2019',
      },
    }
  }

  // UI runs in Figma's Chromium iframe (ES2020+ supported), so no target downlevel needed.
  // code.ts uses es2019 because the plugin sandbox (QuickJS-based) rejects ?? and other ES2020 syntax.
  return {
    plugins: [react(), viteSingleFile()],
    root: path.resolve(__dirname, 'src/ui'),
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        input: path.resolve(__dirname, 'src/ui/index.html'),
      },
    },
  }
})
