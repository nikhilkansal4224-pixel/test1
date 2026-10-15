// Lightweight local development server mimicking Vercel's cleanUrls & /api/config serverless function
// Zero dependencies (uses standard Node.js libraries)

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // 1. Handle Vercel Serverless Function: /api/config
  if (pathname === '/api/config' || pathname === '/api/config.js') {
    try {
      const configModule = await import('./api/config.js');
      const handler = configModule.default;
      return handler(req, {
        setHeader: (k, v) => res.setHeader(k, v),
        status: (code) => ({
          json: (data) => {
            res.writeHead(code, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
          },
          end: () => {
            res.writeHead(code);
            res.end();
          }
        })
      });
    } catch (err) {
      console.error('Error running /api/config handler:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // 2. Normalize path and support Vercel cleanUrls
  if (pathname === '/') {
    pathname = '/index.html';
  } else if (!path.extname(pathname)) {
    // If no extension, test if file.html exists
    const candidateHtml = path.join(PUBLIC_DIR, pathname + '.html');
    if (fs.existsSync(candidateHtml)) {
      pathname = pathname + '.html';
    }
  }

  const filePath = path.join(PUBLIC_DIR, pathname);

  // Security check: ensure within PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Return 404 page
      const notFoundPath = path.join(PUBLIC_DIR, '404.html');
      if (fs.existsSync(notFoundPath)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        return fs.createReadStream(notFoundPath).pipe(res);
      }
      res.writeHead(404);
      return res.end('Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n🍽  Aurelia Bistro local server running at http://localhost:${PORT}`);
  console.log(`✦ Supabase Auth endpoints & clean URLs active\n`);
});
