// Genera tailwind.css (el CSS de Tailwind ya compilado) leyendo las clases que usan index.html y js/.
// Así la web no depende del script de Tailwind por CDN, que bloquea la primera carga.
// Vuelve a ejecutarlo cada vez que añadas clases nuevas:
//     npm i --no-save tailwindcss      (una vez; Tailwind v4)
//     node tools/make-tailwind.js
// Si tienes Tailwind en otra carpeta: TAILWIND_DIR=/ruta/a/node_modules/tailwindcss node tools/make-tailwind.js
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const dir = path.resolve(process.env.TAILWIND_DIR || path.join(root, 'node_modules', 'tailwindcss'));
const files = [];
(function walk(d) {
    for (const f of fs.readdirSync(d)) {
        const p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) { if (!/^(node_modules|\.git|supabase|dist|tools)$/.test(f)) walk(p); }
        else if (/\.(js|html)$/.test(f)) files.push(p);
    }
})(root);
const cands = new Set();
for (const f of files) for (const t of fs.readFileSync(f, 'utf8').split(/[\s"'`<>={};,]+/)) if (t && t.length < 90) cands.add(t);
// clases que se montan con ${…} y el escáner no puede ver
['grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-5'].forEach(c => cands.add(c));
(async () => {
    const { compile } = await import(path.join(dir, 'dist', 'lib.mjs'));
    const load = async id => { const p = id === 'tailwindcss' ? path.join(dir, 'index.css') : id.startsWith('tailwindcss/') ? path.join(dir, id.slice('tailwindcss/'.length) + (id.endsWith('.css') ? '' : '.css')) : require.resolve(id); return { path: p, base: path.dirname(p), content: fs.readFileSync(p, 'utf8') }; };
    const c = await compile('@import "tailwindcss";', { base: root, loadStylesheet: load });
    const css = c.build([...cands]).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*\n/g, '\n');
    fs.writeFileSync(path.join(root, 'tailwind.css'), css);
    console.log('tailwind.css', css.length, 'bytes,', cands.size, 'candidatos');
})().catch(e => { console.error('No se pudo generar tailwind.css:', e.message); process.exit(1); });
