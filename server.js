import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const printedDir = path.join(__dirname, 'printed_docs');
const PORT = process.env.PORT || 3000;

// Stockage léger en mémoire (max 80 fiches imprimées) + disque pour impression directe FiveM (.png)
const printedCache = new Map();
const MAX_CACHED_PRINTS = 80;

try {
  fs.mkdirSync(printedDir, { recursive: true });
} catch {
  // ignore if read-only filesystem
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const safeUrl = (req.url || '/').split('?')[0];

  // CORS preflight for FiveM NUI / printer scripts
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // 1. Endpoint POST /api/print-image -> enregistre la feuille papier A4 PNG et retourne son URL directe .png
  if (req.method === 'POST' && safeUrl === '/api/print-image') {
    let body = '';
    let size = 0;
    const MAX_BODY = 15 * 1024 * 1024; // 15 MB limit (supports DOJ warrants with photo exhibits)

    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Image trop volumineuse' }));
        req.destroy();
        return;
      }
      body += chunk.toString('utf8');
    });

    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const dataUrl = String(parsed.imageData || '');
        const match = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
        if (!match) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Format PNG base64 invalide' }));
        }

        const buffer = Buffer.from(match[1], 'base64');
        const safeRef = String(parsed.docNumber || 'LSPD')
          .replace(/[^a-zA-Z0-9_-]/g, '')
          .slice(0, 24) || 'LSPD';
        const rand = crypto.randomBytes(3).toString('hex');
        const filename = `${safeRef}-${rand}.png`;

        // Store in memory LRU cache
        if (printedCache.size >= MAX_CACHED_PRINTS) {
          const oldestKey = printedCache.keys().next().value;
          printedCache.delete(oldestKey);
        }
        printedCache.set(filename, buffer);

        // Best-effort write to disk
        try {
          fs.writeFileSync(path.join(printedDir, filename), buffer);
        } catch {
          // ignore disk errors
        }

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(JSON.stringify({ ok: true, filename, path: `/printed/${filename}` }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Requête invalide' }));
      }
    });
    return;
  }

  // 2. Endpoint GET /printed/<filename>.png -> sert la feuille A4 PNG directement pour l'imprimante FiveM
  if (req.method === 'GET' && safeUrl.startsWith('/printed/')) {
    const filename = path.basename(safeUrl);
    if (!/^[a-zA-Z0-9_-]+\.png$/.test(filename)) {
      res.writeHead(400);
      return res.end('Invalid filename');
    }

    if (printedCache.has(filename)) {
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400'
      });
      return res.end(printedCache.get(filename));
    }

    const diskPath = path.join(printedDir, filename);
    if (fs.existsSync(diskPath)) {
      fs.readFile(diskPath, (err, data) => {
        if (err) {
          res.writeHead(500);
          return res.end('Error reading file');
        }
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400'
        });
        return res.end(data);
      });
      return;
    }

    res.writeHead(404);
    return res.end('Document non trouvé');
  }

  // 3. Static React app serving
  let filePath = path.join(distDir, safeUrl === '/' ? 'index.html' : safeUrl);

  if (!filePath.startsWith(distDir)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Server Error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`LSPD MDT Server running on port ${PORT}`);
});
