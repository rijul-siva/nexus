const http = require('http');
const fs = require('fs');
const path = require('path');

const root = process.cwd();

const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(root, filePath);
  try { fs.accessSync(filePath); } catch { filePath = path.join(root, 'index.html'); }
  const ext = path.extname(filePath);
  const type = ext === '.html' ? 'text/html; charset=utf-8'
    : ext === '.css'  ? 'text/css; charset=utf-8'
    : ext === '.js'   ? 'application/javascript; charset=utf-8'
    : ext === '.png'  ? 'image/png'
    : ext === '.svg'  ? 'image/svg+xml'
    : ext === '.ico'  ? 'image/x-icon'
    : 'text/plain; charset=utf-8';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

server.listen(4183, '127.0.0.1', () => {
  console.log('SERVING_OK');
});
