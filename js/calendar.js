let currentViewDate = new Date();
let selectedDateKey = getTodayKey();
const isRest = a => /Descanso Total/.test(a);
let agendaDraft = {}; // cambios del plan semanal pendientes de guardar

function dateFromKey(key) { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); }
function dayNameOf(date) { const i = date.getDay(); return daysOfWeek[i === 0 ? 6 : i - 1]; }
function shiftDays(n) { const t = new Date(); return formatDateKey(new Date(t.getFullYear(), t.getMonth(), t.getDate() + n)); }
function weekDates() { const idx = (new Date().getDay() + 6) % 7; return daysOfWeek.map((_, i) => shiftDays(i - idx)); }

// Racha: días completados seguidos; los descansos y el día de hoy aún sin hacer no la rompen
function calcStreak() {
    const log = getLog(), agenda = getAgenda(), ov = getOverrides();
    let s = 0;
    for (let i = 0; i < 365; i++) {
        const k = shiftDays(-i);
        if (log[k]) s++;
        else if (i === 0 || isRest(getPlanFor(k, agenda, ov))) continue;
        else break;
    }
    return s;
}

function goToToday() { currentViewDate = new Date(); selectedDateKey = getTodayKey(); renderMonthlyCalendar(); }
function changeMonth(offset) {
    currentViewDate.setDate(1); // evita saltarse meses (31 ene + 1 mes = marzo)
    currentViewDate.setMonth(currentViewDate.getMonth() + offset);
    renderMonthlyCalendar();
}
function refreshCalendarViews() {
    renderMonthlyCalendar(); renderAgenda(); updateTodayBadge(); renderProgress();
    if (document.getElementById('entreno-panel')) renderEntrenoTab();
}

function renderCalendarStats(year, month, log) {
    const agenda = getAgenda(), ov = getOverrides(), wk = weekDates();
    const done = wk.filter(k => log[k]).length;
    const planned = Math.max(done, wk.filter(k => !isRest(getPlanFor(k, agenda, ov))).length);
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthDone = Object.keys(log).filter(k => k.startsWith(prefix)).length;
    const km = getSessions().filter(s => s.kind === 'run' && s.date && s.date.startsWith(prefix)).reduce((a, s) => a + (s.km || 0), 0);
    const tile = (v, l) => `<div class="bg-slate-50 rounded-xl p-3 text-center"><p class="text-lg font-bold text-slate-900">${v}</p><p class="text-[10px] text-slate-500">${l}</p></div>`;
    document.getElementById('calendar-stats').innerHTML = `
        <div class="grid grid-cols-3 gap-2">${tile('🔥 ' + calcStreak(), 'días de racha')}${tile(monthDone, 'sesiones del mes')}${tile(km.toFixed(1), 'km corridos')}</div>
        <div><div class="flex justify-between text-xs text-slate-600 mb-1"><span>Esta semana</span><span class="font-bold">${done}/${planned} sesiones</span></div>
        <div class="h-2 bg-slate-100 rounded-full"><div class="h-2 bg-emerald-500 rounded-full" style="width:${planned ? Math.min(100, done / planned * 100) : 0}%"></div></div></div>`;
}

function renderMonthlyCalendar() {
    const year = currentViewDate.getFullYear(), month = currentViewDate.getMonth();
    document.getElementById('calendar-month-year').innerText = `${monthNames[month]} ${year}`;
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = getTodayKey(), log = getLog(), agenda = getAgenda(), ov = getOverrides();
    const workoutDates = new Set(getHistory().filter(h => h.date && WORKOUT_RE.test(h.text)).map(h => h.date));

    let html = '<div class="h-10"></div>'.repeat(firstDay);
    for (let day = 1; day <= daysInMonth; day++) {
        const key = formatDateKey(new Date(year, month, day));
        const isToday = key === todayStr, isSelected = key === selectedDateKey;
        const done = log[key] || workoutDates.has(key);
        const pending = !done && key >= todayStr && !isRest(getPlanFor(key, agenda, ov));
        const mark = done ? `<span class="w-1.5 h-1.5 rounded-full ${isToday ? 'bg-amber-300' : 'bg-emerald-500'} absolute bottom-1"></span>`
            : pending ? `<span class="w-1.5 h-1.5 rounded-full border ${isToday ? 'border-white' : 'border-slate-400'} absolute bottom-1"></span>` : '';
        html += `
            <button aria-label="${day} de ${monthNames[month]}" onclick="selectCalendarDay('${key}')" class="h-10 flex flex-col items-center justify-center rounded-xl text-xs relative cursor-pointer transition ${isToday ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'} ${isSelected ? 'ring-2 ring-emerald-400 font-bold' : ''}">
                <span>${day}</span>${mark}
            </button>`;
    }
    document.getElementById('calendar-grid').innerHTML = html;
    renderCalendarStats(year, month, log);
    renderDayDetail();
}

function selectCalendarDay(dateKey) { selectedDateKey = dateKey; renderMonthlyCalendar(); }

function setDayPlan(key, value) {
    const weekly = (getAgenda()[dayNameOf(dateFromKey(key))] || {}).activity;
    setOverride(key, value === weekly ? null : value);
    showToast('Actividad de este día guardada ✓');
    refreshCalendarViews();
}
function toggleDayDone(key) { setDayCompleted(key, !isDayCompleted(key)); refreshCalendarViews(); }

function renderDayDetail() {
    const key = selectedDateKey, date = dateFromKey(key), today = getTodayKey();
    const ov = getOverrides(), plan = getPlanFor(key);
    const done = isDayCompleted(key), rest = isRest(plan);
    // Las medidas corporales solo se ven en Progreso, no en el detalle del día
    const entries = getHistory().filter(h => h.date === key && !/\[Medidas\]/.test(h.text));

    document.getElementById('selected-day-title').innerText = `${dayNameOf(date)} ${date.getDate()} de ${monthNames[date.getMonth()]}`;
    const statusEl = document.getElementById('selected-day-status');
    statusEl.innerText = done ? 'COMPLETADO 🏆' : rest ? 'DESCANSO' : key > today ? 'PLANIFICADO' : key === today ? 'PENDIENTE' : 'NO REALIZADO';
    statusEl.className = `text-[10px] font-bold px-2 py-0.5 rounded-md ${done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`;

    const actions = [];
    if (key === today && !done && !rest) actions.push(`<button onclick="switchTab('entreno')" class="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-xl text-xs cursor-pointer">Ir a entrenar</button>`);
    if (key <= today) actions.push(`<button onclick="toggleDayDone('${key}')" class="flex-1 bg-slate-100 text-slate-700 font-bold py-2 rounded-xl text-xs cursor-pointer">${done ? 'Quitar marca de hecho' : 'Marcar como hecho'}</button>`);

    document.getElementById('selected-day-content').innerHTML = `
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
            <p class="font-bold text-slate-800">Actividad: <span class="text-emerald-700">${escapeHtml(plan)}</span>${ov[key] ? ' <span class="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">Solo este día</span>' : ''}</p>
            <select aria-label="Cambiar la actividad solo de este día" onchange="setDayPlan('${key}', this.value)" class="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs">
                ${getWorkoutCategories().map(c => `<option value="${escapeHtml(c)}" ${c === plan ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
            </select>
            <p class="text-[11px] text-slate-500">Este cambio solo afecta a este día; la rutina semanal no se toca.</p>
        </div>
        ${actions.length ? `<div class="flex gap-2">${actions.join('')}</div>` : ''}
        ${entries.map(e => `<div class="p-2 bg-slate-50 rounded-lg border border-slate-100">${escapeHtml(e.text)}</div>`).join('')}`;
}

const actIcon = a => /Spinning/.test(a) ? '🚴' : ({ strength: '🏋️', run: '🏃', stretch: '🧘', rest: '😴', class: '🤸' })[kindOf(a)];

function renderAgenda() {
    const agenda = getAgenda(), ov = getOverrides(), log = getLog();
    const todayKey = getTodayKey(), wk = weekDates(), categories = getWorkoutCategories();

    // Tira compacta de la semana (siempre visible)
    document.getElementById('week-strip').innerHTML = daysOfWeek.map((day, i) => {
        const key = wk[i], plan = getPlanFor(key, agenda, ov), done = !!log[key], isToday = key === todayKey;
        return `<div title="${day}: ${escapeHtml(plan)}" class="flex flex-col items-center py-1.5 rounded-xl border text-center ${done ? 'bg-emerald-600 border-emerald-600 text-white' : isToday ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-slate-50 border-slate-100 text-slate-600'}"><span class="text-[10px] font-bold">${day.slice(0, 3)}</span><span class="text-base leading-6">${actIcon(plan)}</span><span class="text-[9px]">${done ? '✓' : '&nbsp;'}</span></div>`;
    }).join('');

    // Editor: una fila por día, con los cambios como borrador hasta pulsar Guardar
    document.getElementById('agenda-cards-container').innerHTML = daysOfWeek.map(day => {
        const saved = (agenda[day] || { activity: 'Descanso Total' }).activity;
        const val = agendaDraft[day] ?? saved, changed = val !== saved;
        return `<div class="flex items-center gap-2"><span class="w-9 text-[11px] font-bold text-slate-700">${day.slice(0, 3)}</span>
            <select aria-label="Actividad habitual del ${day}" onchange="draftAgenda('${day}', this.value, this)" class="flex-1 min-w-0 px-2 py-2 border rounded-xl text-xs font-medium ${changed ? 'bg-amber-50 border-amber-400' : 'bg-white border-slate-200'}">
            ${categories.map(opt => `<option value="${escapeHtml(opt)}" ${opt === val ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}</select></div>`;
    }).join('');
    updatePlanActions();
    renderCustomCategories();
}

function renderCustomCategories() {
    const box = document.getElementById('custom-category-list');
    if (!box) return;
    const custom = getWorkoutCategories().filter(c => !initialWorkoutCategories.includes(c));
    box.innerHTML = custom.map(c => `<span class="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded-full">${escapeHtml(c)}<button aria-label="Eliminar ${escapeHtml(c)}" data-n="${escapeHtml(c)}" onclick="deleteCustomCategory(this.dataset.n)" class="text-slate-500 hover:text-red-500 cursor-pointer">✕</button></span>`).join('');
}

async function deleteCustomCategory(name) {
    if (!await UI.confirm({ title: `¿Eliminar "${name}"?`, message: 'Los días que la usen pasarán a Descanso Total.', confirmText: 'Eliminar', tone: 'danger' })) return;
    DB.setItem('dreamfit_workout_categories', JSON.stringify(getWorkoutCategories().filter(c => c !== name)));
    const agenda = getAgenda();
    daysOfWeek.forEach(d => { if (agenda[d].activity === name) agenda[d].activity = 'Descanso Total'; });
    const ov = getOverrides();
    Object.keys(ov).forEach(k => { if (ov[k] === name) delete ov[k]; });
    DB.setItem('dreamfit_overrides', JSON.stringify(ov));
    saveAgenda(agenda);
    renderAllSelects();
}

function draftAgenda(day, value, el) {
    const saved = getAgenda()[day].activity;
    if (value === saved) delete agendaDraft[day]; else agendaDraft[day] = value;
    el.className = el.className.replace(/bg-amber-50 border-amber-400|bg-white border-slate-200/, value === saved ? 'bg-white border-slate-200' : 'bg-amber-50 border-amber-400');
    updatePlanActions();
}
function updatePlanActions() {
    const n = Object.keys(agendaDraft).length;
    const save = document.getElementById('plan-save-btn');
    save.disabled = n === 0;
    save.innerText = n ? `Guardar cambios (${n})` : 'Guardar cambios';
    document.getElementById('plan-discard-btn').disabled = n === 0;
}
function saveWeeklyPlan() {
    const agenda = getAgenda();
    Object.entries(agendaDraft).forEach(([d, v]) => { agenda[d].activity = v; });
    agendaDraft = {};
    saveAgenda(agenda); // vuelve a pintar calendario, tira e insignia de hoy
    showToast('Plan semanal guardado ✓');
}
function discardWeeklyPlan() { agendaDraft = {}; renderAgenda(); }
function togglePlanEditor() {
    const ed = document.getElementById('plan-editor'), btn = document.getElementById('plan-edit-btn');
    const opening = ed.classList.contains('hidden');
    if (!opening && Object.keys(agendaDraft).length) { showToast('Guarda o descarta los cambios antes de cerrar.'); return; }
    ed.classList.toggle('hidden', !opening);
    btn.innerText = opening ? 'Cerrar' : 'Editar';
    btn.setAttribute('aria-expanded', String(opening));
}

async function resetWeeklyAgenda() {
    if (await UI.confirm({ title: '¿Restablecer el plan semanal?', message: 'Volverá al plan inicial y se perderán tus cambios.', confirmText: 'Restablecer', tone: 'warn', icon: 'fa-rotate-left' })) {
        DB.removeItem('dreamfit_agenda_v2');
        agendaDraft = {};
        renderAgenda(); renderMonthlyCalendar(); updateTodayBadge();
    }
}
