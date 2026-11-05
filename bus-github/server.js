import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import handler from './api/bus.js';
const files = { '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'], '/favicon.svg': ['favicon.svg', 'image/svg+xml'] };
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/api/bus') return handler(req, res);
  const file = files[path];
  if (!file) { res.writeHead(404); return res.end('Not found'); }
  try { const content = await readFile(new URL(file[0], import.meta.url)); res.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8` }); res.end(content); }
  catch { res.writeHead(500); res.end('File unavailable'); }
});
server.listen(process.env.PORT || 3001, '127.0.0.1', () => console.log(`Bus On Time: http://localhost:${server.address().port}`));
