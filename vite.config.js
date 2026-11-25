import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function devPrintApiPlugin() {
  const cache = new Map();
  return {
    name: 'dev-print-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0];
        if (req.method === 'POST' && url === '/api/print-image') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString('utf8'); });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body || '{}');
              const match = String(parsed.imageData || '').match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
              if (!match) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'Invalid PNG' }));
              }
              const buf = Buffer.from(match[1], 'base64');
              const safeRef = String(parsed.docNumber || 'LSPD').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'LSPD';
              const filename = `${safeRef}-${crypto.randomBytes(3).toString('hex')}.png`;
              cache.set(filename, buf);
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              return res.end(JSON.stringify({ ok: true, filename, path: `/printed/${filename}` }));
            } catch {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
          });
          return;
        }
        if (req.method === 'GET' && url.startsWith('/printed/')) {
          const filename = path.basename(url);
          if (cache.has(filename)) {
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.end(cache.get(filename));
          }
        }
        next();
      });
    }
  };
}

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
  plugins: [react(), devPrintApiPlugin(), fileProtocolCompatibilityPlugin()],
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
