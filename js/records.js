// ===== REGISTROS: los datos que CRECEN con el tiempo se guardan en la nube como UNA FILA POR REGISTRO =====
// Pesos, fuerza, días, historial, carreras y medidas ya no viajan como un JSON gigante dentro de user_data:
// cada registro (un peso, una serie de un día, un día…) es una fila de la tabla «records» (supabase/05-registros.sql).
// En el móvil sigue guardándose igual (localStorage); aquí solo se traduce de/para la nube.
// Cada registro tiene un identificador estable (rid), así que al cambiar uno solo se envía ese y se pueden hacer consultas.
const RECORD_KEYS = {
    dreamfit_weights:  { kind: 'list' },    // [{date, kg, ts}]
    dreamfit_history:  { kind: 'list' },    // [{date, text}]
    dreamfit_sessions: { kind: 'list' },    // carreras: [{date, ...}]
    dreamfit_measures: { kind: 'list' },    // medidas: [{date, ...}]
    dreamfit_days:     { kind: 'dict' },    // {fecha: {water, kcal, ...}}
    dreamfit_log:      { kind: 'dict' },    // {fecha: true}
    dreamfit_strength: { kind: 'nested' }   // {ejercicio: [{date, weight, result, sets}]} (más reciente primero)
};
const isRecordKey = k => Object.prototype.hasOwnProperty.call(RECORD_KEYS, k);
const recKind = key => key.replace(/^dreamfit_/, '');
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const rdate = d => (typeof d === 'string' && DATE_RE.test(d) ? d : null);

function canon(v) { // JSON con las claves ordenadas: así el mismo dato siempre da el mismo texto (la nube reordena las claves)
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
    return JSON.stringify(v === undefined ? null : v);
}
function hashStr(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + ':' + s.length; }
const recHash = r => hashStr(canon(r.data));

// valor guardado (texto JSON) → { rid: {date, data} }
function toRecords(key, raw) {
    const out = {}, spec = RECORD_KEYS[key]; let v;
    try { v = raw == null ? null : JSON.parse(raw); } catch { return out; }
    if (v == null) return out;
    if (spec.kind === 'list' && Array.isArray(v)) {
        const seen = {};
        for (let i = v.length - 1; i >= 0; i--) { // de la más antigua a la más reciente: el orden dentro del día es estable al añadir
            const e = v[i]; if (!e || typeof e !== 'object') continue;
            const d = typeof e.date === 'string' ? e.date : '', n = seen[d] = (seen[d] || 0) + 1;
            out[`${d}|${n - 1}`] = { date: rdate(d), data: e };
        }
    } else if (spec.kind === 'dict' && v && typeof v === 'object' && !Array.isArray(v)) {
        for (const [d, e] of Object.entries(v)) out[d] = { date: rdate(d), data: e && typeof e === 'object' && !Array.isArray(e) ? e : { __v: e } };
    } else if (spec.kind === 'nested' && v && typeof v === 'object' && !Array.isArray(v)) {
        for (const [name, list] of Object.entries(v)) {
            if (!Array.isArray(list)) continue;
            const seen = {};
            for (let i = list.length - 1; i >= 0; i--) {
                const e = list[i]; if (!e || typeof e !== 'object') continue;
                const d = typeof e.date === 'string' ? e.date : '', n = seen[d] = (seen[d] || 0) + 1;
                out[`${name}|${d}|${n - 1}`] = { date: rdate(d), data: { n: name, e } };
            }
        }
    }
    return out;
}
const ridParts = rid => { const i = rid.lastIndexOf('|'); return { head: rid.slice(0, i), ord: +rid.slice(i + 1) || 0 }; };
// { rid: {date, data} } → valor guardado (texto JSON), con el mismo formato de siempre
function fromRecords(key, recs) {
    const spec = RECORD_KEYS[key], ids = Object.keys(recs);
    const newestFirst = (a, b) => { const x = ridParts(a), y = ridParts(b); return x.head < y.head ? 1 : x.head > y.head ? -1 : y.ord - x.ord; };
    if (spec.kind === 'list') return JSON.stringify(ids.sort(newestFirst).map(r => recs[r].data));
    if (spec.kind === 'dict') { const o = {}; ids.sort().forEach(r => { const d = recs[r].data; o[r] = d && d.__v !== undefined ? d.__v : d; }); return JSON.stringify(o); }
    const o = {}, byName = {};
    ids.forEach(r => { const d = recs[r].data; if (d && typeof d.n === 'string') (byName[d.n] = byName[d.n] || []).push(r); });
    Object.keys(byName).forEach(n => { o[n] = byName[n].sort((a, b) => { const x = ridParts(a), y = ridParts(b); const dx = recs[a].data.e.date || '', dy = recs[b].data.e.date || ''; return dx < dy ? 1 : dx > dy ? -1 : y.ord - x.ord; }).map(r => recs[r].data.e); });
    return JSON.stringify(o);
}
// Mezcla local / nube / base (lo último sincronizado). Devuelve los registros resultantes y si hay algo local por enviar.
// Regla (igual que antes, pero por registro): lo que no has tocado aquí se actualiza desde la nube; si lo tocaste aquí, gana lo local.
function mergeRecords(local, remote, base) {
    const merged = {}, newBase = {}; let pending = false;
    for (const rid of new Set([...Object.keys(local), ...Object.keys(remote)])) {
        const l = local[rid], r = remote[rid], b = base[rid];
        const hl = l ? recHash(l) : undefined, hr = r ? recHash(r) : undefined;
        if (hl === hr) { if (l) { merged[rid] = l; newBase[rid] = hl; } continue; }          // ya coinciden
        if (hl === b) { if (r) { merged[rid] = r; newBase[rid] = hr; } continue; }         // lo local no cambió: gana la nube (o se borró allí)
        pending = true; if (l) merged[rid] = l; if (b !== undefined) newBase[rid] = b;       // cambiado aquí: gana lo local y se enviará
    }
    return { merged, newBase, pending };
}
// Qué enviar: registros nuevos/cambiados y borrados, respecto a lo ya sincronizado
function diffRecords(local, base) {
    const up = [], del = [];
    for (const [rid, r] of Object.entries(local)) if (recHash(r) !== base[rid]) up.push(rid);
    for (const rid of Object.keys(base)) if (!local[rid]) del.push(rid);
    return { up, del };
}
if (typeof module !== 'undefined') module.exports = { RECORD_KEYS, toRecords, fromRecords, mergeRecords, diffRecords, canon, recHash };
