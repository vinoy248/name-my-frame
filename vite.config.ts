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
