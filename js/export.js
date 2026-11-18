// ===== PRIVACIDAD Y DATOS: descargar todo, consentimiento, borrar datos locales =====
// «Descargar mis datos» genera un ZIP (sin librerías ni red) con tablas CSV que abre Excel y una copia completa en JSON.

// ---------- ZIP mínimo (sin compresión) ----------
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function makeZip(files, when = new Date()) { // files: [{ name, data: string }] -> Blob
    const enc = new TextEncoder(), parts = [], central = [];
    const time = (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1), date = ((when.getFullYear() - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate();
    let offset = 0;
    files.forEach(f => {
        const name = enc.encode(f.name), data = enc.encode(f.data), crc = crc32(data);
        const lh = new DataView(new ArrayBuffer(30));
        lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true); lh.setUint16(10, time, true); lh.setUint16(12, date, true);
        lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
        parts.push(new Uint8Array(lh.buffer), name, data);
        const ch = new DataView(new ArrayBuffer(46));
        ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, time, true); ch.setUint16(14, date, true);
        ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
        central.push(new Uint8Array(ch.buffer), name);
        offset += 30 + name.length + data.length;
    });
    const cdSize = central.reduce((t, c) => t + c.length, 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

// ---------- CSV (separador «;» y coma decimal: lo que espera Excel en español) ----------
const csvNum = v => (v === null || v === undefined || v === '' || Number.isNaN(v)) ? '' : String(v).replace('.', ',');
function csvText(v) { // texto seguro: comillas y sin «fórmulas» (=, +, -, @ al principio) que Excel ejecutaría
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
const toCsv = (head, rows) => '﻿' + [head, ...rows].map(r => r.join(';')).join('\r\n') + '\r\n';
const RESULT_TXT = { yes: 'completó todo', mid: 'casi', no: 'no pudo' };

function collectExport() {
    const T = csvText, N = csvNum, prof = getProfile(), files = [];
    const add = (name, head, rows) => files.push({ name, data: toCsv(head, rows) });
    add('perfil.csv', ['campo', 'valor'], prof ? [
        ['objetivo', T((GOALS[prof.goal] || {}).label || prof.goal)], ['nivel', T((LEVELS[prof.level] || {}).label || prof.level)], ['dias_de_fuerza_por_semana', N(prof.days)],
        ['lugar', T(PLACES[prof.place] || prof.place)], ['sexo', T(SEXES[prof.sex] || '')], ['edad', N(prof.age)], ['altura_cm', N(prof.height)], ['peso_kg', N(prof.weight)],
        ['actividad', T((ACTIVITY[prof.activity] || {}).label || '')], ['ajuste_de_calorias_aceptado', N(prof.kcalAdj || 0)]
    ] : []);
    add('peso.csv', ['fecha', 'peso_kg'], getWeights().slice().reverse().map(e => [e.date, N(e.kg)]));
    add('medidas.csv', ['fecha', 'cintura_cm', 'cadera_cm'], getMeasures().slice().reverse().map(e => [e.date, N(e.waist), N(e.hip)]));
    const str = getStrength(), fuerza = [];
    Object.entries(str).forEach(([name, list]) => (list || []).forEach(e => fuerza.push([e.date, T(name), N(e.weight), T(RESULT_TXT[e.result] || e.result || ''), T((e.sets || []).map(s => s.reps).join('/'))])));
    add('fuerza.csv', ['fecha', 'ejercicio', 'peso_kg', 'resultado', 'repeticiones_por_serie'], fuerza.sort((a, b) => a[0].localeCompare(b[0])));
    add('sesiones.csv', ['fecha', 'tipo', 'km', 'minutos', 'nivel', 'sensacion', 'notas', 'manual'],
        getSessions().slice().reverse().map(s => [s.date, T(s.kind === 'run' ? 'running' : s.kind === 'class' ? 'clase' : s.kind === 'stretch' ? 'movilidad' : s.kind), N(s.km), N(s.minutes), N(s.level), T(s.feeling || ''), T(s.notes || ''), s.manual ? 'sí' : 'no']));
    const days = getDays(), log = getLog(), keys = [...new Set([...Object.keys(days), ...Object.keys(log)])].sort();
    add('dias.csv', ['fecha', 'entreno_hecho', 'vasos_de_agua', 'comidas_apuntadas', 'kcal', 'proteina_g', 'antojos_sos'],
        keys.map(k => { const d = days[k] || {}; return [k, log[k] ? 'sí' : 'no', N(d.water), N(d.meals), N(d.kcal), N(d.protein), N(d.sos)]; }));
    add('historial.csv', ['fecha', 'texto'], getHistory().slice().reverse().map(h => [h.date, T(h.text)]));
    add('recetas.csv', ['titulo', 'descripcion', 'momento'], (DB.getItem('dreamfit_custom_recipes') ? safeParse('dreamfit_custom_recipes', []) : []).map(r => [T(r.title), T(r.desc), T(r.target || '')]));
    add('compra.csv', ['producto', 'cantidad', 'comprado'], safeParse('dreamfit_shop', []).filter(i => i && i.n).map(i => [T(i.n), T(i.q || ''), i.done ? 'sí' : 'no']));
    const all = {}; DB.keys().forEach(k => { all[k] = DB.getItem(k); });
    files.push({ name: 'datos-completos.json', data: JSON.stringify({ app: 'Mi Plan Fitness', exportado: new Date().toISOString(), datos: all }, null, 1) });
    files.unshift({ name: 'LEEME.txt', data: [
        'Mis datos de Mi Plan Fitness', 'Exportado el ' + getTodayKey(), '',
        'Los archivos .csv se abren con Excel, Numbers o Google Hojas (separador «;», decimales con coma, codificación UTF-8).',
        '  perfil.csv      tu objetivo y tus datos del cuerpo', '  peso.csv        historial de peso', '  medidas.csv     cintura y cadera', '  fuerza.csv      pesos y repeticiones por ejercicio',
        '  sesiones.csv    carreras, clases y movilidad', '  dias.csv        agua, comidas, calorías, proteína y entrenos por día', '  historial.csv   registro de actividad en texto', '  recetas.csv     tus recetas guardadas', '',
        'datos-completos.json es una copia completa. Para restaurarla en la app usa Perfil > Copia de seguridad > Importar (con el archivo que descarga el botón «Exportar», no este ZIP).'
    ].join('\r\n') + '\r\n' });
    return files;
}
function downloadMyData() {
    try {
        const blob = makeZip(collectExport()), a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'mis-datos-fitness-' + getTodayKey() + '.zip';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        showToast('Datos descargados ✓');
    } catch (e) { showToast('No se pudo preparar la descarga.', 'error'); }
}

// ---------- Consentimiento ----------
const getConsent = () => safeParse('dreamfit_consent', null);
const consentOk = () => { const c = getConsent(); return !!c && c.v >= CONSENT_VERSION; };
function recordConsent() { DB.setItem('dreamfit_consent', JSON.stringify({ v: CONSENT_VERSION, ts: Date.now() })); }
async function acceptConsent() { recordConsent(); startAfterConsent(); }
async function declineConsent() { // no acepta: se cierra la sesión y no se deja nada en este dispositivo
    try { await Auth.signOut(); } catch (e) { /* aunque falle, se limpia lo local */ }
    if (Sync.enabled) { Sync.stop(); Sync.clearMeta(); }
    DB.clearScope(); location.reload();
}

// ---------- Tarjeta «Privacidad y tus datos» (Perfil) ----------
function renderPrivacyCard() {
    const el = document.getElementById('privacy-card'); if (!el) return;
    const c = getConsent(), when = c && c.ts ? new Date(c.ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
    el.innerHTML = `<h3 class="font-bold text-sm text-slate-900 flex items-center gap-2"><i class="fa-solid fa-shield-halved text-emerald-600" aria-hidden="true"></i> Privacidad y tus datos</h3>
        <p class="text-xs text-slate-500">${Auth.user ? 'Tus datos de salud y hábitos se guardan en tu cuenta y solo los ves tú.' : 'Sin cuenta, tus datos solo están en este dispositivo.'} Puedes llevártelos o borrarlos cuando quieras.</p>
        ${Auth.user && when ? `<p class="text-[11px] text-slate-500">Consentimiento aceptado el ${when}.</p>` : ''}
        <div class="flex gap-2 text-xs"><button onclick="downloadMyData()" class="flex-1 bg-slate-800 text-white font-bold py-2.5 rounded-xl cursor-pointer"><i class="fa-solid fa-download mr-1" aria-hidden="true"></i>Descargar mis datos</button>
        <button onclick="openPrivacy()" class="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl cursor-pointer hover:bg-slate-200">Política de privacidad</button></div>
        <p class="text-[11px] text-slate-500">La descarga es un ZIP con tablas para Excel (peso, medidas, fuerza, días…) y una copia completa.</p>
        ${Auth.user ? '' : '<button onclick="clearLocalData()" class="text-[11px] text-red-600 underline cursor-pointer">Borrar los datos de este dispositivo</button>'}`;
}
async function clearLocalData() {
    const t = await UI.prompt({ title: 'Borrar los datos de este dispositivo', message: 'Se borrarán de forma permanente tu plan, entrenos, peso, medidas y recetas guardados aquí. No se puede deshacer.\n\nEscribe BORRAR para confirmar.', expected: 'BORRAR', placeholder: 'BORRAR', confirmText: 'Borrar todo', tone: 'danger', icon: 'fa-trash' });
    if (t !== 'BORRAR') return;
    DB.clearScope(); location.reload();
}
