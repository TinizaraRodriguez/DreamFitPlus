let historyExpanded = false;
const trim1 = v => +Number(v).toFixed(1);
const chartDate = ms => { const d = new Date(ms); return `${d.getDate()}/${d.getMonth() + 1}`; };
const emptyMsg = t => `<p class="text-xs text-slate-500 italic">${t}</p>`;
const statTile = (v, l) => `<div class="bg-slate-50 rounded-xl p-3 text-center"><p class="text-lg font-bold text-slate-900">${v}</p><p class="text-[10px] text-slate-500">${l}</p></div>`;

// ---------- Gráficas SVG (sin librerías, funcionan sin conexión) ----------
function lineChart(series, unit = '', animate = false, xl = null) {
    const pts = series.flatMap(s => s.points);
    if (!pts.length) return emptyMsg('Aún no hay datos: en cuanto guardes el primero, aparecerá aquí.');
    const W = 320, H = 150, L = 34, R = 14, T = 10, B = 22;
    const xmin = Math.min(...pts.map(p => p.x)), xmax = Math.max(...pts.map(p => p.x));
    let x0 = xmin, x1 = xmax;
    if (x0 === x1) { x0 -= 1; x1 += 1; }
    let y0 = Math.min(...pts.map(p => p.y)), y1 = Math.max(...pts.map(p => p.y));
    const pad = ((y1 - y0) || 2) * 0.2; y0 -= pad; y1 += pad;
    const X = x => L + (x - x0) / (x1 - x0) * (W - L - R), Y = y => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
    const grid = [0, 0.5, 1].map(t => { const v = y0 + (y1 - y0) * t, y = Y(v); return `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="#e2e8f0"/><text x="${L - 4}" y="${y + 3}" text-anchor="end" font-size="9" fill="#64748b">${trim1(v)}</text>`; }).join('');
    const path = ps => ps.map(p => `${X(p.x)},${Y(p.y)}`).join(' ');
    const lines = series.map(s => {
        const real = s.points.filter(p => !p.preview), prev = s.points.find(p => p.preview);
        const main = real.length > 1 ? `<polyline pathLength="1" class="${animate ? 'chart-line' : ''}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" points="${path(real)}"/>` : '';
        const dash = prev && real.length ? `<polyline fill="none" stroke="${s.color}" stroke-width="2" stroke-dasharray="4 3" points="${path([real[real.length - 1], prev])}"/>` : '';
        const dots = s.points.map(p => p.preview
            ? `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="4" fill="white" stroke="${s.color}" stroke-width="2" stroke-dasharray="3 2"/>`
            : `<circle class="${animate ? 'chart-dot' : ''}" cx="${X(p.x)}" cy="${Y(p.y)}" r="3" fill="${s.color}"/>`).join('');
        return main + dash + dots;
    }).join('');
    const last = series.map(s => { const p = s.points[s.points.length - 1]; return p ? `<text x="${Math.min(X(p.x), W - R)}" y="${Y(p.y) - 8}" text-anchor="end" font-size="9" font-weight="700" fill="${s.color}">${trim1(p.y)}${unit}</text>` : ''; }).join('');
    const xlabels = xl
        ? xl.map((l, i, a) => `<text x="${X(l.x)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === a.length - 1 ? 'end' : 'middle'}" font-size="9" fill="#64748b">${l.label}</text>`).join('')
        : `<text x="${L}" y="${H - 6}" font-size="9" fill="#64748b">${chartDate(xmin)}</text>${xmin !== xmax ? `<text x="${W - R}" y="${H - 6}" text-anchor="end" font-size="9" fill="#64748b">${chartDate(xmax)}</text>` : ''}`;
    return `<svg viewBox="0 0 ${W} ${H}" class="w-full h-auto" role="img">${grid}${lines}${last}${xlabels}</svg>`;
}

// items: { wd (inicial del día), day (nº), today, value (km guardados), preview (km sin guardar) }
function barChart(items, animate = false) {
    const W = 320, H = 150, B = 32, T = 16, n = items.length, bw = W / n, ph = H - B - T, base = H - B;
    const max = Math.max(...items.map(i => i.value + (i.preview || 0)), 1);
    return `<svg viewBox="0 0 ${W} ${H}" class="w-full h-auto" role="img">${items.map((it, i) => {
        const x = i * bw + bw * 0.18, w = bw * 0.64, cx = x + w / 2, total = it.value + (it.preview || 0);
        const hv = ph * it.value / max, hp = ph * (it.preview || 0) / max, cls = animate ? 'chart-bar' : '';
        const showLbl = n <= 14 || (n - 1 - i) % 5 === 0, showVal = total > 0 && (n <= 14 || total === max);
        const fill = it.today ? '#047857' : '#64748b', fw = it.today ? 700 : 400;
        const bars = total === 0 ? `<rect x="${x}" y="${base - 2}" width="${w}" height="2" rx="1" fill="#e2e8f0"/>`
            : (it.value ? `<rect class="${cls}" x="${x}" y="${base - hv}" width="${w}" height="${hv}" rx="3" fill="#10b981"/>` : '')
            + (it.preview ? `<rect x="${x}" y="${base - hv - hp}" width="${w}" height="${hp}" rx="3" fill="#a7f3d0" stroke="#10b981" stroke-dasharray="3 2"/>` : '')
            + (showVal ? `<text x="${cx}" y="${base - hv - hp - 3}" text-anchor="middle" font-size="9" font-weight="700" fill="#047857">${trim1(total)}</text>` : '');
        const lbl = showLbl ? `<text x="${cx}" y="${H - 19}" text-anchor="middle" font-size="9" fill="${fill}" font-weight="${fw}">${it.wd}</text><text x="${cx}" y="${H - 8}" text-anchor="middle" font-size="9" fill="${fill}" font-weight="${fw}">${it.day}</text>` : '';
        return bars + lbl;
    }).join('')}</svg>`;
}

// ---------- Medidas ----------
const msOf = e => e.ts ?? dateFromKey(e.date).getTime();
function getMeasures() {
    let list = safeParse('dreamfit_measures', null);
    if (!DB.getItem('dreamfit_measures_v2')) {
        // Recupera del historial TODAS las medidas guardadas (antes se fusionaban las del mismo día)
        const num = m => m ? parseFloat(m[1].replace(',', '.')) : null;
        const hist = getHistory().filter(h => h.date && /\[Medidas\]/.test(h.text));
        if (hist.length) list = hist.map((h, i) => ({
            date: h.date, ts: dateFromKey(h.date).getTime() + (hist.length - i) * 1000, approx: true,
            waist: num(/Cintura: ([\d.,]+)/.exec(h.text)), hip: num(/Cadera: ([\d.,]+)/.exec(h.text))
        }));
        DB.setItem('dreamfit_measures', JSON.stringify(list || []));
        DB.setItem('dreamfit_measures_v2', '1');
    }
    return (list || []).slice().sort((a, b) => msOf(b) - msOf(a)); // la más reciente primero
}
function saveMeasures() {
    const w = parseFloat(document.getElementById('measure-waist').value);
    const h = parseFloat(document.getElementById('measure-hip').value);
    if (isNaN(w) && isNaN(h)) { showToast('Introduce al menos una medida.'); return; }
    const list = getMeasures();
    const ts = Math.max(Date.now(), list.length ? msOf(list[0]) + 1 : 0); // cada guardado es un punto nuevo
    const entry = { date: getTodayKey(), ts, waist: isNaN(w) ? null : w, hip: isNaN(h) ? null : h };
    list.unshift(entry);
    DB.setItem('dreamfit_measures', JSON.stringify(list));
    addHistory(`📏 [Medidas] Cintura: ${entry.waist ?? '-'} cm | Cadera: ${entry.hip ?? '-'} cm`);
    document.getElementById('measure-waist').value = '';
    document.getElementById('measure-hip').value = '';
    showToast('¡Medidas guardadas!');
    renderProgress();
}
async function deleteMeasure(i) {
    if (!await UI.confirm({ title: '¿Eliminar este registro?', message: 'Se quitará de tu historial de medidas y de las gráficas.', confirmText: 'Eliminar', tone: 'danger' })) return;
    const list = getMeasures();
    list.splice(i, 1);
    DB.setItem('dreamfit_measures', JSON.stringify(list));
    renderProgress();
}
function pickLabels(arr) { // evita que las etiquetas del eje se solapen
    if (arr.length <= 5) return arr.filter(l => l.label);
    const step = Math.ceil(arr.length / 4);
    return arr.filter((l, i) => l.label && (i === 0 || i === arr.length - 1 || (i % step === 0 && arr.length - 1 - i >= step / 2)));
}
function previewMeasures() { // vista previa en vivo mientras escribes
    const w = parseFloat(document.getElementById('measure-waist').value), h = parseFloat(document.getElementById('measure-hip').value);
    renderMeasures({ waist: isNaN(w) ? null : w, hip: isNaN(h) ? null : h });
}
function renderMeasures(preview = null) {
    const list = getMeasures(), chrono = list.slice().reverse(), n = chrono.length;
    const live = preview && (preview.waist != null || preview.hip != null);
    const mk = (key, name, color) => {
        const pts = [];
        chrono.forEach((e, i) => { if (e[key] != null) pts.push({ x: i, y: e[key] }); });
        if (preview && preview[key] != null) pts.push({ x: n, y: preview[key], preview: true });
        return { name, color, points: pts };
    };
    const series = [mk('waist', 'Cintura', '#059669'), mk('hip', 'Cadera', '#d97706')];
    // Eje X: un punto por registro (así varios guardados el mismo día se ven por separado)
    const count = {}, seen = {};
    chrono.forEach(e => count[e.date] = (count[e.date] || 0) + 1);
    const labels = chrono.map((e, i) => {
        const [, m, d] = e.date.split('-'), day = `${+d}/${+m}`, first = !seen[e.date];
        seen[e.date] = true;
        const t = e.ts && !e.approx ? new Date(e.ts).toTimeString().slice(0, 5) : '';
        return { x: i, label: first ? (count[e.date] > 1 && t ? `${day} ${t}` : day) : t };
    });
    if (live) labels.push({ x: n, label: 'Nuevo' });
    const legend = series.map(s => `<span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full inline-block" style="background:${s.color}"></span>${s.name}</span>`).join('');
    const deltas = series.map(s => ({ s, real: s.points.filter(p => !p.preview) })).filter(o => o.real.length > 1).map(({ s, real }) => {
        const a = real[0].y, b = real[real.length - 1].y, d = b - a;
        return `<p class="text-[11px] text-slate-600">${s.name}: ${trim1(a)} → ${trim1(b)} cm <b class="${d <= 0 ? 'text-emerald-700' : 'text-amber-700'}">(${d > 0 ? '+' : ''}${trim1(d)})</b></p>`;
    }).join('');
    const hint = live ? '<p class="text-[11px] text-amber-700">Vista previa: pulsa «Guardar medidas» para registrarlo.</p>' : '';
    document.getElementById('measures-chart').innerHTML = `<div class="flex gap-4 text-[11px] text-slate-600">${legend}</div>${lineChart(series, '', !preview, pickLabels(labels))}${hint}${deltas}`;
    document.getElementById('measures-list').innerHTML = list.slice(0, 5).map((e, i) => `<div class="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-100"><span>${e.date}${e.ts && !e.approx ? ' ' + new Date(e.ts).toTimeString().slice(0, 5) : ''} · Cintura ${e.waist ?? '-'} · Cadera ${e.hip ?? '-'}</span><button aria-label="Eliminar registro del ${e.date}" onclick="deleteMeasure(${i})" class="text-slate-500 hover:text-red-500 px-2 cursor-pointer">✕</button></div>`).join('');
    const lastW = list.find(e => e.waist != null), lastH = list.find(e => e.hip != null);
    document.getElementById('measure-waist').placeholder = lastW ? `Última: ${lastW.waist}` : 'Ej: 75';
    document.getElementById('measure-hip').placeholder = lastH ? `Última: ${lastH.hip}` : 'Ej: 98';
}

// ---------- Fuerza ----------
function renderStrengthProgress() {
    const data = getStrength(), names = Object.keys(data);
    const sel = document.getElementById('progress-machine'), box = document.getElementById('strength-chart');
    if (!names.length) { sel.classList.add('hidden'); box.innerHTML = emptyMsg('Registra tus pesas en Entreno y aquí verás cómo subes de carga.'); return; }
    sel.classList.remove('hidden');
    const cur = names.includes(sel.value) ? sel.value : names[0];
    sel.innerHTML = names.map(n => `<option value="${escapeHtml(n)}" ${n === cur ? 'selected' : ''}>${escapeHtml(n)}</option>`).join('');
    const pts = data[cur].slice().reverse().map(e => ({ x: dateFromKey(e.date).getTime(), y: e.weight }));
    const d = pts[pts.length - 1].y - pts[0].y;
    box.innerHTML = lineChart([{ name: cur, color: '#059669', points: pts }], ' kg', true) +
        `<p class="text-[11px] text-slate-600">${pts.length} sesiones · ${trim1(pts[0].y)} → ${trim1(pts[pts.length - 1].y)} kg <b class="text-emerald-700">(${d >= 0 ? '+' : ''}${trim1(d)})</b></p>`;
}

// ---------- Running ----------
let runRange = 14; // días que muestra la gráfica de running
function setRunRange(n) { runRange = n; renderRunProgress(); }
function previewRun() { // la barra del día crece mientras escribes los km
    const km = parseFloat(document.getElementById('run-add-km').value);
    renderRunProgress({ km: km > 0 ? km : 0, date: document.getElementById('run-add-date').value || getTodayKey() });
}
function saveRunKm() {
    const km = parseFloat(document.getElementById('run-add-km').value);
    const date = document.getElementById('run-add-date').value || getTodayKey();
    if (!(km > 0)) { showToast('Introduce los km corridos.'); return; }
    const all = getSessions();
    all.unshift({ date, kind: 'run', manual: true, km });
    DB.setItem('dreamfit_sessions', JSON.stringify(all));
    addHistory(`🏃 [Entreno] Carrera libre: ${trim1(km)} km`, date);
    setDayCompleted(date, true);
    document.getElementById('run-add-km').value = '';
    showToast(`¡${trim1(km)} km guardados! 🏃`);
    renderProgress(); renderMonthlyCalendar(); renderAgenda(); updateTodayBadge();
}
function renderRunProgress(preview = null) {
    const runs = getSessions().filter(s => s.kind === 'run'), n = runRange;
    const dateEl = document.getElementById('run-add-date');
    if (!dateEl.value) dateEl.value = getTodayKey();
    dateEl.max = getTodayKey();
    [14, 30].forEach(r => {
        const b = document.getElementById('run-range-' + r), on = r === n;
        ['bg-emerald-600', 'text-white'].forEach(c => b.classList.toggle(c, on));
        ['bg-slate-100', 'text-slate-600'].forEach(c => b.classList.toggle(c, !on));
    });
    const items = [], today = getTodayKey();
    for (let i = n - 1; i >= 0; i--) { // una barra por día; varias carreras el mismo día se suman
        const key = shiftDays(-i), d = dateFromKey(key);
        items.push({
            wd: ['D', 'L', 'M', 'X', 'J', 'V', 'S'][d.getDay()], day: d.getDate(), today: key === today,
            value: runs.filter(r => r.date === key).reduce((t, r) => t + (r.km || 0), 0),
            preview: preview && preview.km > 0 && preview.date === key ? preview.km : 0
        });
    }
    const inRange = runs.filter(r => r.date >= shiftDays(-(n - 1)) && r.date <= today);
    const km = inRange.reduce((t, r) => t + (r.km || 0), 0);
    const guided = runs.filter(r => !r.manual);
    const lines = [runs.length ? `${trim1(km)} km en los últimos ${n} días · ${inRange.length} carrera${inRange.length === 1 ? '' : 's'}` : 'Aún no has registrado carreras.'];
    if (guided.length) { const { lvl } = runPlan(); lines.push(`Nivel actual: ${lvl + 1} de ${RUN_LEVELS.length} · ${runDesc(RUN_LEVELS[lvl])}`); }
    document.getElementById('run-info').innerText = lines.join('\n');
    document.getElementById('run-chart').innerHTML = barChart(items, !preview);
}

// ---------- Resumen e historial ----------
function renderHistory() {
    const h = getHistory(), box = document.getElementById('history-box'), btn = document.getElementById('history-more');
    if (!h.length) { box.innerHTML = emptyMsg('Aquí aparecerán tus entrenamientos guardados.'); btn.classList.add('hidden'); return; }
    box.innerHTML = (historyExpanded ? h : h.slice(0, 8)).map(e => `<div class="p-2 bg-slate-50 rounded-lg border border-slate-100">${e.date ? `<span class="text-slate-500">${e.date}</span> ` : ''}${escapeHtml(e.text)}</div>`).join('');
    btn.classList.toggle('hidden', h.length <= 8);
    btn.innerText = historyExpanded ? 'Ver menos' : `Ver todo (${h.length})`;
}
function toggleHistory() { historyExpanded = !historyExpanded; renderHistory(); }

function renderProgress() {
    const km = getSessions().filter(s => s.kind === 'run').reduce((t, s) => t + (s.km || 0), 0);
    document.getElementById('progress-summary').innerHTML = `<div class="grid grid-cols-3 gap-2">${statTile(Object.keys(getLog()).length, 'sesiones totales')}${statTile(trim1(km), 'km corridos')}${statTile('🔥 ' + calcStreak(), 'días de racha')}</div>`;
    renderMeasures(); renderStrengthProgress(); renderRunProgress(); renderHistory();
}
function loadHistory() { renderProgress(); } // los demás módulos llaman a esto tras guardar
