// ===== PESTAÑA HOY =====
const MEAL_SHORT = { morn: 'Tentempié', lunch: 'Almuerzo', snack: 'Merienda', dinner: 'Cena' };
const MEAL_FULL = { morn: 'Tentempié (10-11h)', lunch: 'Almuerzo principal', snack: 'Merienda', dinner: 'Cena' };
let lastPct = 0;

// ---------- Registro diario (agua, comidas y antojos por fecha) ----------
function getDays() { return safeParse('dreamfit_days', {}); }
function setDayStat(key, patch) {
    const d = getDays();
    d[key] = { ...(d[key] || {}), ...patch };
    DB.setItem('dreamfit_days', JSON.stringify(d));
}
function mealsCount() { return Object.values(MEAL_IDS).filter(id => document.getElementById(id).value.trim()).length; }
function currentMeal() { const h = new Date().getHours(); return h < 12 ? 'morn' : h < 17 ? 'lunch' : h < 20 ? 'snack' : 'dinner'; }
function sosWeek() { const d = getDays(); let n = 0; for (let i = 0; i < 7; i++) n += (d[shiftDays(-i)] || {}).sos || 0; return n; }
function strengthProgress() {
    const ms = getDayMachines(getTodayName()), h = getStrength(), key = getTodayKey();
    return { done: ms.filter(m => (h[m.name] || [])[0]?.date === key).length, total: ms.length, ms, h, key };
}

// ---------- Render general ----------
function updateTodayBadge() { renderToday(); } // otros módulos llaman a este nombre
function renderToday() {
    renderTodayHeader(); renderTodayWorkout(); renderSosCounter(); renderTodayLive(); renderMealChips(); renderAdviceCard();
}
function renderTodayLive() { // lo que cambia al escribir / beber agua
    renderTodaySummary(); renderWaterMsg(); renderWeekCard(); renderMealsList(); renderNutDay();
}
function renderTodayHeader() {
    const h = new Date().getHours(), d = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const nm = ((typeof Auth !== 'undefined' && Auth.user && Auth.user.name) || '').split(' ')[0];
    document.getElementById('today-greeting').innerText = (h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches') + (nm ? ', ' + nm : '');
    document.getElementById('current-date-text').innerText = d.charAt(0).toUpperCase() + d.slice(1);
}

function renderTodaySummary() {
    const key = getTodayKey(), kind = kindOf(getPlanFor(key)), done = isDayCompleted(key);
    const parts = [], meals = mealsCount();
    if (kind !== 'rest' || done) {
        const sp = kind === 'strength' ? strengthProgress() : null;
        parts.push({ label: 'Entreno', frac: done ? 1 : sp ? sp.done / sp.total : 0, text: done ? 'Hecho' : sp ? `${sp.done}/${sp.total}` : 'Pendiente' });
    }
    parts.push({ label: 'Agua', frac: waterLevel / waterGoal(), text: `${waterLevel}/${waterGoal()}` });
    parts.push({ label: 'Comidas', frac: meals / 4, text: `${meals}/4` });
    const pct = Math.round(parts.reduce((t, p) => t + p.frac, 0) / parts.length * 100);
    const msg = pct === 0 ? '¡Empieza el día con un vaso de agua!' : pct < 50 ? 'Buen comienzo, sigue así.' : pct < 100 ? '¡Vas genial, ya casi!' : '¡Día perfecto! 🏆';
    const chips = parts.map(p => `<div class="rounded-xl p-2 text-center ${p.frac >= 1 ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-600'}"><p class="text-[10px] font-semibold">${p.label}</p><p class="text-xs font-bold">${p.frac >= 1 ? '✅ ' : ''}${p.text}</p></div>`).join('');
    document.getElementById('today-summary').innerHTML = `
        <div class="flex justify-between items-end gap-2">
            <div><p class="text-3xl font-bold text-slate-900">${pct}%</p><p class="text-xs text-slate-500">${msg}</p></div>
            <span class="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full whitespace-nowrap">🔥 ${calcStreak()} días de racha</span>
        </div>
        <div class="h-2 bg-slate-100 rounded-full" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div id="today-bar" class="h-2 bg-emerald-500 rounded-full transition-all duration-500 motion-reduce:transition-none" style="width:${lastPct}%"></div></div>
        <div class="grid grid-cols-${parts.length} gap-2">${chips}</div>`;
    const grow = () => { const b = document.getElementById('today-bar'); if (b) b.style.width = pct + '%'; };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(grow); else grow();
    lastPct = pct;
}

// ---------- Entreno de hoy (cambia según la actividad planificada) ----------
function toggleTodayDone() {
    setDayCompleted(getTodayKey(), !isDayCompleted(getTodayKey()));
    refreshCalendarViews();
}
function renderTodayWorkout() {
    const key = getTodayKey(), plan = getPlanFor(key), kind = kindOf(plan), done = isDayCompleted(key);
    let info = '', started = false;
    if (kind === 'strength') {
        const sp = strengthProgress();
        started = sp.done > 0;
        info = `<ul class="space-y-1.5">${sp.ms.map(m => {
            const d = (sp.h[m.name] || [])[0]?.date === sp.key;
            return `<li class="flex justify-between items-center text-xs p-2 rounded-lg ${d ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-700'}"><span>${d ? '✅' : '⬜'} ${escapeHtml(m.name)}</span><span class="font-semibold">${d ? 'hecho' : suggestWeight(m).w + ' kg'}</span></li>`;
        }).join('')}</ul>`;
    } else if (kind === 'run') {
        const { lvl, why } = runPlan(), L = RUN_LEVELS[lvl];
        info = `<div class="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center"><p class="text-[10px] font-bold text-emerald-700 uppercase">${savedToday('run') ? 'Próxima sesión' : 'Tu sesión de hoy'}</p><p class="font-bold text-emerald-900 text-sm">${runDesc(L)}</p><p class="text-[11px] text-emerald-700">Nivel ${lvl + 1} de ${RUN_LEVELS.length} · ≈ ${(L.run + L.walk) * L.reps} min</p></div><p class="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg">💡 ${why}</p>`;
    } else if (kind === 'class') {
        const last = getSessions().filter(s => s.kind === 'class' && s.type === plan)[0];
        const adv = !last ? 'Primera vez: ve a un ritmo cómodo y apunta cómo te sienta.' : last.feeling === 'hard' ? 'La última vez fue dura: hoy baja un punto la carga y cuida la técnica.' : last.feeling === 'easy' ? 'La última te resultó fácil: hoy puedes subir un poco la intensidad.' : 'Mantén la intensidad de la última sesión.';
        info = `<p class="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg">💡 ${adv}</p>`;
    } else if (kind === 'stretch') {
        info = '<p class="text-xs text-slate-600">Rutina de 7 estiramientos, unos 10 minutos.</p>';
    } else {
        info = '<p class="text-xs text-slate-600">Hoy toca recuperar 😴: duerme bien, hidrátate y, si te apetece, da un paseo suave.</p>';
    }
    const go = kind !== 'rest' && !done ? `<button onclick="switchTab('entreno')" class="flex-1 bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-emerald-700">${started ? 'Continuar' : 'Ir a entrenar'}</button>` : '';
    const mark = `<button onclick="toggleTodayDone()" class="${go ? 'flex-1' : 'w-full'} bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-slate-200">${done ? 'Quitar marca de hecho' : 'Marcar como hecho'}</button>`;
    document.getElementById('today-workout').innerHTML = `
        <div class="flex justify-between items-center gap-2"><h3 class="font-bold text-sm text-slate-900 flex items-center gap-2"><i class="fa-solid fa-circle-check text-emerald-600"></i> Entreno de hoy</h3><span class="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100 text-right">${actIcon(plan)} ${escapeHtml(plan)}</span></div>
        ${done ? '<div class="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3 rounded-xl">✅ Entreno completado. ¡Buen trabajo!</div>' : ''}
        ${info}
        <div class="flex gap-2">${go}${mark}</div>`;
}

// ---------- Agua ----------
function renderWaterMsg() {
    const left = waterGoal() - waterLevel;
    document.getElementById('water-msg').innerText = left <= 0 ? '¡Meta de hidratación cumplida! 💧' : `Te ${left === 1 ? 'falta 1 vaso' : 'faltan ' + left + ' vasos'} para la meta de hoy.`;
}

// ---------- Comidas: lista compacta + hoja para registrar ----------
let mealModalKey = 'dinner';
function renderMealsCard() { // los valores viven en campos ocultos; la interfaz es la lista y la hoja
    document.getElementById('meals-store').innerHTML = Object.values(MEAL_IDS).map(id => `<input type="hidden" id="${id}">`).join('');
}
function renderMealsList() {
    const now = currentMeal();
    document.getElementById('meals-count').innerText = mealsCount() + '/4';
    document.getElementById('meals-list').innerHTML = Object.keys(MEAL_IDS).map(k => {
        const v = document.getElementById(MEAL_IDS[k]).value.trim();
        const tail = !v && k === now ? '<span class="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap">Ahora toca</span>' : `<span class="text-slate-500 text-sm" aria-hidden="true">${v ? '✎' : '+'}</span>`;
        return `<button type="button" onclick="openMealModal('${k}')" class="w-full flex items-center gap-2 text-left p-2.5 rounded-xl cursor-pointer ${v ? 'bg-emerald-50' : 'bg-slate-50'}"><span class="text-[11px] font-bold w-[4.5rem] shrink-0 text-slate-600">${MEAL_SHORT[k]}</span><span class="flex-1 min-w-0 truncate text-xs ${v ? 'text-slate-800' : 'text-slate-500 italic'}">${v ? escapeHtml(v) : 'Sin registrar'}</span>${nutTag(k)}${tail}</button>`;
    }).join('');
}
function openMealModal(k) {
    if (!k) { // botón «Añadir»: la comida de ahora si está vacía; si no, la primera vacía
        const empty = Object.keys(MEAL_IDS).filter(x => !document.getElementById(MEAL_IDS[x]).value.trim());
        k = empty.includes(currentMeal()) ? currentMeal() : (empty[0] || currentMeal());
    }
    mealModalKey = k;
    renderMealModal();
    const m = document.getElementById('meal-modal');
    m.classList.remove('hidden'); m.classList.add('flex');
    document.getElementById('meal-edit-input').focus();
}
function closeMealModal() { const m = document.getElementById('meal-modal'); m.classList.add('hidden'); m.classList.remove('flex'); }
function selectMealInModal(k) { mealModalKey = k; renderMealModal(); }
function renderMealModal() {
    document.getElementById('meal-pills').innerHTML = Object.keys(MEAL_IDS).map(k => {
        const on = k === mealModalKey;
        return `<button type="button" aria-pressed="${on}" onclick="selectMealInModal('${k}')" class="py-2 rounded-xl border text-[11px] font-semibold cursor-pointer ${on ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}">${MEAL_SHORT[k]}</button>`;
    }).join('');
    document.getElementById('meal-edit-input').value = document.getElementById(MEAL_IDS[mealModalKey]).value;
    renderMealNut();
    document.getElementById('meal-modal-title').innerText = MEAL_FULL[mealModalKey];
    renderMealChips();
}
function saveMealModal() {
    let v = document.getElementById('meal-edit-input').value.trim();
    const nut = readMealNut();
    if (nut === false) { showToast('Revisa las calorías o la proteína: valores no válidos.'); return; }
    if (!v && nut) v = 'Comida sin detallar'; // solo se anotaron los números
    document.getElementById(MEAL_IDS[mealModalKey]).value = v;
    if (v && nut) mealNut[mealModalKey] = nut; else delete mealNut[mealModalKey];
    saveState();
    closeMealModal();
    showToast(v ? 'Comida guardada ✓' : 'Comida vaciada');
}
function clearMealModal() { document.getElementById('meal-edit-input').value = ''; document.getElementById('meal-kcal').value = ''; document.getElementById('meal-prot').value = ''; saveMealModal(); }
function renderMealChips() { // atajos con tus recetas guardadas para la comida elegida
    const box = document.getElementById('meal-modal-chips');
    if (!box) return;
    box.innerHTML = getSavedRecipes().filter(r => (r.target || 'dinner') === mealModalKey).slice(0, 4).map(r =>
        `<button type="button" data-id="${r.id}" onclick="pickMealRecipe(this)" class="max-w-full truncate text-[11px] bg-emerald-50 text-emerald-800 font-semibold px-2.5 py-1 rounded-full cursor-pointer hover:bg-emerald-100">${escapeHtml(r.title)}</button>`).join('')
        || '<span class="text-[11px] text-slate-500">Aún no tienes recetas guardadas para esta comida.</span>';
}
function pickMealRecipe(btn) {
    const r = getSavedRecipes().find(x => String(x.id) === btn.dataset.id);
    if (!r) return;
    document.getElementById('meal-edit-input').value = r.title;
    const kc = r.kcal || +((/≈\s*(\d+)\s*kcal/.exec(r.desc || '') || [])[1]), pr = r.protein || +((/≈\s*(\d+)\s*g proteína/.exec(r.desc || '') || [])[1]);
    if (trackingOn() && (kc || pr)) { document.getElementById('meal-kcal').value = kc || ''; document.getElementById('meal-prot').value = pr || ''; renderPortions(); }
}

// ---------- Tu semana (últimos 7 días, en vivo) ----------
function renderWeekCard() {
    const days = getDays(), today = getTodayKey(), letters = ['D', 'L', 'M', 'X', 'J', 'V', 'S'], meals = mealsCount();
    const cells = [];
    for (let i = 6; i >= 0; i--) {
        const key = shiftDays(-i), d = dateFromKey(key), isToday = key === today;
        const st = isToday ? { water: waterLevel, meals } : (days[key] || {});
        const w = st.water || 0, m = st.meals || 0, done = isDayCompleted(key);
        cells.push(`<div role="img" aria-label="${letters[d.getDay()]} ${d.getDate()}: ${w} de ${waterGoal()} vasos, ${m} de 4 comidas${done ? ', entreno hecho' : ''}" class="flex flex-col items-center gap-1">
            <div class="h-16 w-full flex items-end justify-center gap-1"><div class="w-2.5 rounded-t ${w ? 'bg-blue-400' : 'bg-slate-200'}" style="height:${Math.max(w / waterGoal() * 100, 4)}%"></div><div class="w-2.5 rounded-t ${m ? 'bg-amber-400' : 'bg-slate-200'}" style="height:${Math.max(m / 4 * 100, 4)}%"></div></div>
            <span class="text-[10px] ${isToday ? 'font-bold text-emerald-700' : 'text-slate-500'}">${letters[d.getDay()]}</span>
            <span class="text-[11px]">${done ? '✅' : '·'}</span></div>`);
    }
    document.getElementById('week-today').innerHTML = `<div class="grid grid-cols-7 gap-1">${cells.join('')}</div>
        <div class="flex flex-wrap gap-x-4 gap-y-1 justify-center text-[11px] text-slate-500"><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-blue-400 inline-block"></span>Agua</span><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-amber-400 inline-block"></span>Comidas</span><span>✅ Entreno</span></div>`;
}

// ---------- SOS anti-picoteo guiado ----------
let sosEnd = 0, sosTimer = null;
function renderSosCounter() {
    const n = sosWeek();
    document.getElementById('sos-week').innerText = n ? `Antojos superados esta semana: ${n} 💪` : 'Pulsa para frenar el picoteo y evaluar.';
}
function openSosModal() { sosStep('start'); document.getElementById('sos-modal').classList.remove('hidden'); }
function closeSosModal() { clearInterval(sosTimer); sosTimer = null; document.getElementById('sos-modal').classList.add('hidden'); }
const sosBtn = (fn, txt, style = 'bg-amber-500 text-white hover:bg-amber-600') => `<button onclick="${fn}" class="w-full ${style} font-bold py-2.5 rounded-xl text-xs cursor-pointer transition">${txt}</button>`;
function sosStep(step) {
    clearInterval(sosTimer); sosTimer = null;
    const body = document.getElementById('sos-body');
    if (step === 'start') {
        body.innerHTML = `<p><b>Paso 1:</b> bebe un vaso grande de agua y espera 5 minutos. Muchas veces es sed o aburrimiento.</p>${sosBtn('sosDrink()', waterLevel < waterGoal() ? 'Ya bebí (+1 vaso) · empezar 5 min' : 'Empezar 5 min')}`;
    } else if (step === 'timer') {
        body.innerHTML = `<p class="text-center">Respira hondo y date un paseo corto mientras esperas.</p><p id="sos-clock" class="text-center text-4xl font-bold text-amber-600" aria-live="off">5:00</p>${sosBtn('sosStep(\'ask\')', 'Saltar la espera', 'bg-slate-100 text-slate-700 hover:bg-slate-200')}`;
        sosEnd = Date.now() + 300000;
        sosTimer = setInterval(() => {
            const left = Math.max(0, Math.ceil((sosEnd - Date.now()) / 1000)), el = document.getElementById('sos-clock');
            if (el) el.innerText = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
            if (left <= 0) sosStep('ask');
        }, 500);
    } else if (step === 'ask') {
        body.innerHTML = `<p class="text-center font-semibold text-slate-800">¿Sigues con ganas de picar?</p>${sosBtn('sosWin()', 'Ya se me pasó 🎉', 'bg-emerald-600 text-white hover:bg-emerald-700')}${sosBtn('sosStep(\'options\')', 'Sigo con hambre', 'bg-slate-100 text-slate-700 hover:bg-slate-200')}`;
    } else if (step === 'win') {
        body.innerHTML = `<p class="text-center text-sm font-bold text-emerald-700">¡Antojo superado! 💪</p><p class="text-center">Llevas ${sosWeek()} esta semana.</p>${sosBtn('closeSosModal()', 'Cerrar')}`;
    } else if (step === 'options') {
        const picks = getSavedRecipes().filter(r => ['snack', 'dinner'].includes(r.target || 'dinner')).sort((a, b) => /anti/i.test(b.tag || '') - /anti/i.test(a.tag || '')).slice(0, 3);
        body.innerHTML = `<p><b>Paso 2:</b> ¿te comerías ahora una manzana o verduras cocidas? Si es así, es hambre real. Opciones saciantes:</p>
            ${picks.map(r => `<button data-id="${r.id}" onclick="sosUse(this)" class="w-full text-left bg-emerald-50 text-emerald-800 font-semibold px-3 py-2 rounded-xl text-xs cursor-pointer hover:bg-emerald-100">${escapeHtml(r.title)} <span class="font-normal text-emerald-600">· usar en diario</span></button>`).join('')}
            <p class="text-slate-500">O un té caliente o una pieza de fruta.</p>${sosBtn('closeSosModal()', 'Cerrar', 'bg-slate-100 text-slate-700 hover:bg-slate-200')}`;
    }
}
function sosDrink() {
    if (waterLevel < waterGoal()) { setWaterUI(waterLevel + 1); saveState(); }
    sosStep('timer');
}
function sosWin() {
    setDayStat(getTodayKey(), { sos: ((getDays()[getTodayKey()] || {}).sos || 0) + 1 });
    renderSosCounter(); sosStep('win');
}
function sosUse(btn) {
    const r = getSavedRecipes().find(x => String(x.id) === btn.dataset.id);
    closeSosModal();
    if (r) sendToMeal(r.target || 'snack', r.title);
}
