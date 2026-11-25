import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function fileProtocolCompatibilityPlugin() {
  return {
    name: 'file-protocol-compatibility',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      const baseCssPath = path.resolve('src/sevenBase.css');
      const customCssPath = path.resolve('src/index.css');
      const baseCss = fs.existsSync(baseCssPath) ? fs.readFileSync(baseCssPath, 'utf-8') : '';
      const customCss = fs.existsSync(customCssPath) ? fs.readFileSync(customCssPath, 'utf-8') : '';
      return html
        .replace(/\s+type="module"/g, ' defer')
        .replace(/\s+crossorigin/g, '')
        .replace('</head>', `  <style>\n${baseCss}\n${customCss}\n  </style>\n  </head>`);
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), fileProtocolCompatibilityPlugin()],
  build: {
    rollupOptions: {
      output: {
        format: 'iife',
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
