const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function send(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(body);
}

function resolveRequestPath(rootDir, publicDir, requestUrl) {
  const url = new URL(requestUrl, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/' || pathname === '/index.html') {
    return path.join(rootDir, 'index.html');
  }

  const filePath = path.resolve(publicDir, `.${pathname}`);
  if (!filePath.startsWith(publicDir)) return null;
  return filePath;
}

function createStaticHandler(rootDir) {
  const publicDir = path.join(rootDir, 'public');

  return (req, res) => {
    const filePath = resolveRequestPath(rootDir, publicDir, req.url);
    if (!filePath) {
      send(res, 403, 'Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        send(res, 404, 'Not found');
        return;
      }

      const contentType = MIME_TYPES[path.extname(filePath)] || 'application/octet-stream';
      send(res, 200, data, contentType);
    });
  };
}

module.exports = { createStaticHandler };
