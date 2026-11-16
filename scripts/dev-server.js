// Servidor local sin dependencias para desarrollar: `npm run dev` -> http://localhost:5173
// Sirve la carpeta del proyecto tal cual y desactiva la caché para ver siempre los últimos cambios.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 5173;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end('Petición no válida'); return; }
  let file = path.join(ROOT, rel);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403).end('Prohibido'); return; } // nada fuera del proyecto
  const rest = path.relative(ROOT, file).split(path.sep);
  if (rest.some(p => p.startsWith('.') && p !== '') || rest[0] === 'node_modules' || rest[0] === 'supabase') { res.writeHead(404).end('No encontrado'); return; } // ocultos y backend
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (e, data) => {
      if (e) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
});

server.on('error', e => {
  console.error(e.code === 'EADDRINUSE' ? `\nEl puerto ${PORT} está ocupado. Prueba con otro: PORT=3000 npm run dev\n` : e);
  process.exit(1);
});
server.listen(PORT, () => {
  const lan = Object.values(os.networkInterfaces()).flat().find(i => i && i.family === 'IPv4' && !i.internal);
  console.log(`\n  Mi Plan Fitness en desarrollo\n\n  Ordenador:  http://localhost:${PORT}\n${lan ? `  Móvil (misma wifi):  http://${lan.address}:${PORT}\n` : ''}\n  Ctrl+C para parar\n`);
});
