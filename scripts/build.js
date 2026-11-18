// Prepara la carpeta dist/ con SOLO lo que necesita la web (así no se publican supabase/, README, scripts…).
// Uso: npm run build   ·   En Cloudflare Pages: comando `npm run build`, directorio de salida `dist`.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist');
const INCLUDE = ['index.html', 'privacidad.html', 'tailwind.css', 'styles.css', '_headers', 'js'];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const name of INCLUDE) {
  const from = path.join(ROOT, name);
  if (!fs.existsSync(from)) { if (name === '_headers') continue; console.error(`Falta ${name}`); process.exit(1); }
  fs.cpSync(from, path.join(OUT, name), { recursive: true });
}

// Comprobación: todo lo que carga index.html (scripts y estilos locales) tiene que estar en dist/
const html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:src|href)="([^"#?]+)"/g)].map(m => m[1]).filter(r => !/^(https?:)?\/\//.test(r) && !r.startsWith('data:'));
const missing = refs.filter(r => !fs.existsSync(path.join(OUT, r)));
if (missing.length) { console.error('index.html usa archivos que no están en dist/: ' + missing.join(', ')); process.exit(1); }

const count = dir => fs.readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(dir, e.name)) : 1), 0);
console.log(`dist/ listo: ${count(OUT)} archivos (${refs.length} referencias comprobadas)`);
