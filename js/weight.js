// ===== HISTORIAL DE PESO =====
// dreamfit_weights = [{ date: 'YYYY-MM-DD', kg, ts }] (un registro por día). El peso del perfil es siempre el más reciente.
let weightRange = 90; // días que muestra la gráfica (0 = todo)

function getWeights() { // más reciente primero
    let raw = safeParse('dreamfit_weights', null);
    if (raw === null) { // primera vez: parte del peso que ya tenías en el perfil
        const p = getProfile();
        raw = p && p.weight ? [{ date: formatDateKey(new Date(p.ts || Date.now())), kg: p.weight, ts: p.ts || Date.now() }] : [];
        DB.setItem('dreamfit_weights', JSON.stringify(raw));
    }
    return raw.slice().sort((a, b) => b.date.localeCompare(a.date) || (b.ts || 0) - (a.ts || 0));
}
const validKg = kg => kg >= 30 && kg <= 250;
function saveWeights(list) { DB.setItem('dreamfit_weights', JSON.stringify(list)); }
function recordWeight(kg, date = getTodayKey()) { // un registro por día: el último sustituye al anterior
    const list = getWeights().filter(e => e.date !== date);
    list.unshift({ date, kg: Math.round(kg * 10) / 10, ts: Date.now() });
    saveWeights(list);
    afterWeightChange();
}
function syncProfileWeight() { // el peso del perfil (y con él las calorías, macros y agua) sigue al registro más reciente
    const p = getProfile(), latest = getWeights()[0];
    if (p && latest && p.weight !== latest.kg) DB.setItem('dreamfit_profile', JSON.stringify({ ...p, weight: latest.kg, ts: Date.now() }));
}
function afterWeightChange() {
    syncProfileWeight();
    renderWeight(); renderGoalCard(); renderNutriCard(); renderWaterCard(); renderTodayLive();
}
// Tendencia en kg por semana (regresión lineal de los últimos `days` días); null si hay pocos datos
function weightTrend(days = 28) {
    const from = shiftDays(-days), pts = getWeights().filter(e => e.date >= from).reverse().map(e => ({ x: dateFromKey(e.date).getTime() / 86400000, y: e.kg }));
    if (pts.length < 2 || pts[pts.length - 1].x - pts[0].x < 6) return null;
    const n = pts.length, mx = pts.reduce((t, p) => t + p.x, 0) / n, my = pts.reduce((t, p) => t + p.y, 0) / n;
    const sxx = pts.reduce((t, p) => t + (p.x - mx) ** 2, 0), sxy = pts.reduce((t, p) => t + (p.x - mx) * (p.y - my), 0);
    return sxx ? { perWeek: sxy / sxx * 7, n, span: Math.round(pts[pts.length - 1].x - pts[0].x) } : null;
}
const fmtKg = v => String(trim1(v)).replace('.', ',');
const fmtDelta = v => (v > 0 ? '+' : v < 0 ? '−' : '') + fmtKg(Math.abs(v));

function saveWeight() {
    const kg = numOr(document.getElementById('weight-kg').value), date = document.getElementById('weight-date').value || getTodayKey();
    if (kg === null) { showToast('Introduce tu peso.'); return; }
    if (!validKg(kg)) { showToast('Indica un peso válido (entre 30 y 250 kg).'); return; }
    if (date > getTodayKey()) { showToast('La fecha no puede ser futura.'); return; }
    const replaced = getWeights().some(e => e.date === date);
    document.getElementById('weight-kg').value = '';
    recordWeight(kg, date);
    showToast(replaced ? 'Peso de ese día actualizado ✓' : `Peso guardado: ${fmtKg(kg)} kg`);
}
async function editWeight(i) {
    const list = getWeights(), e = list[i]; if (!e) return;
    const v = await UI.prompt({ title: 'Corregir peso', message: `Registro del ${e.date}`, value: String(e.kg), inputType: 'number', inputMode: 'decimal', step: '0.1', confirmText: 'Guardar' });
    if (v === null) return;
    const kg = numOr(v);
    if (!validKg(kg)) { showToast('Indica un peso válido (entre 30 y 250 kg).'); return; }
    list[i] = { ...e, kg: Math.round(kg * 10) / 10 };
    saveWeights(list); afterWeightChange(); showToast('Peso actualizado ✓');
}
async function deleteWeight(i) {
    const list = getWeights(), e = list[i]; if (!e) return;
    if (!await UI.confirm({ title: '¿Eliminar este peso?', message: `${e.date} · ${fmtKg(e.kg)} kg. Se quitará de tu historial y de la gráfica.`, confirmText: 'Eliminar', tone: 'danger' })) return;
    list.splice(i, 1); saveWeights(list); afterWeightChange(); showToast('Registro eliminado.');
}
function setWeightRange(d) { weightRange = d; renderWeight(); }
function previewWeight() { renderWeight(numOr(document.getElementById('weight-kg').value)); }

function renderWeight(preview = null) {
    const box = document.getElementById('weight-chart'); if (!box) return;
    const all = getWeights(), from = weightRange ? shiftDays(-weightRange) : '0000-00-00';
    const shown = all.filter(e => e.date >= from).reverse();
    const pts = shown.map(e => ({ x: dateFromKey(e.date).getTime(), y: e.kg }));
    const live = preview != null && validKg(preview);
    if (live) pts.push({ x: dateFromKey(getTodayKey()).getTime() + (shown.length && shown[shown.length - 1].date === getTodayKey() ? 1 : 0), y: preview, preview: true });
    document.getElementById('weight-range').innerHTML = [[30, '30 días'], [90, '90 días'], [0, 'Todo']].map(([d, l]) => `<button onclick="setWeightRange(${d})" aria-pressed="${weightRange === d}" class="px-3 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${weightRange === d ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}">${l}</button>`).join('');
    box.innerHTML = lineChart([{ name: 'Peso', color: '#059669', points: pts }], 'kg', !live) + (live ? '<p class="text-[11px] text-amber-700">Vista previa: pulsa «Guardar peso» para registrarlo.</p>' : '');
    // resumen
    const first = all[all.length - 1], last = all[0], tr = weightTrend();
    const tiles = !last ? '' : [
        statTile(fmtKg(last.kg) + ' kg', 'peso actual'),
        statTile(all.length > 1 ? fmtDelta(last.kg - first.kg) + ' kg' : '—', all.length > 1 ? 'desde el inicio' : 'desde el inicio'),
        statTile(tr ? fmtDelta(tr.perWeek) + ' kg' : '—', 'por semana (4 sem.)')
    ].join('');
    document.getElementById('weight-summary').innerHTML = last ? `<div class="grid grid-cols-3 gap-2">${tiles}</div>${tr ? '' : '<p class="text-[11px] text-slate-500 mt-2">Con 2 o más pesos separados al menos una semana verás tu tendencia. Pésate a la misma hora, mejor una vez por semana.</p>'}` : '';
    document.getElementById('weight-list').innerHTML = all.slice(0, 5).map((e, i) => `<div class="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100"><span class="flex-1">${e.date} · <b class="text-slate-800">${fmtKg(e.kg)} kg</b></span>
        <button aria-label="Corregir peso del ${e.date}" onclick="editWeight(${i})" class="w-8 h-8 rounded-lg text-slate-500 hover:bg-emerald-100 hover:text-emerald-700 cursor-pointer"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>
        <button aria-label="Eliminar peso del ${e.date}" onclick="deleteWeight(${i})" class="w-8 h-8 rounded-lg text-slate-500 hover:bg-red-100 hover:text-red-600 cursor-pointer"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button></div>`).join('');
    const di = document.getElementById('weight-date'); if (di && !di.value) di.value = getTodayKey();
    if (di) di.max = getTodayKey();
    document.getElementById('weight-kg').placeholder = last ? `Último: ${fmtKg(last.kg)}` : 'Ej: 68,5';
}
