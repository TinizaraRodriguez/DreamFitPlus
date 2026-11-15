// Rutinas de fuerza: las genera js/plan.js según el perfil (objetivo, nivel, días y lugar).
function getDayMachines(dayName) {
    // la rutina depende de cuántos días de fuerza lleva la semana hasta ese día
    const agenda = getAgenda(), routines = planRoutines();
    let n = 0;
    for (const d of daysOfWeek) {
        if (/Pesas|Fuerza/.test(agenda[d].activity)) n++;
        if (d === dayName) break;
    }
    return routines[Math.max(n - 1, 0) % routines.length];
}

function addCustomCategory() {
    const input = document.getElementById('new-category-name');
    const name = input.value.trim();
    if(!name) { showToast('Indica el nombre de la nueva actividad.'); return; }

    const categories = getWorkoutCategories();
    if(!categories.includes(name)) {
        categories.push(name);
        DB.setItem('dreamfit_workout_categories', JSON.stringify(categories));
        input.value = '';
        renderAllSelects();
        renderAgenda();
        showToast(`¡Categoría "${name}" añadida correctamente!`);
    } else {
        showToast('Esa categoría ya existe.');
    }
}

function renderAllSelects() {
    const categories = getWorkoutCategories();
    const workoutSelect = document.getElementById('workout-type');
    if(workoutSelect) {
        const currentVal = workoutSelect.value;
        workoutSelect.innerHTML = categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        if(currentVal && categories.includes(currentVal)) workoutSelect.value = currentVal;
    }
}

// ===== ENTRENO DINÁMICO =====
const FEEL = [['easy', '😄 Fácil'], ['ok', '🙂 Bien'], ['hard', '🥵 Duro']];
const FEEL_TXT = { easy: 'fácil', ok: 'bien', hard: 'dura' };
const resultTxt = r => ({ yes: 'completó ' + getScheme().label.replace('×', 'x'), mid: 'casi', no: 'no pudo' })[r];
const RUN_LEVELS = [
    { run: 2, walk: 1, reps: 8 }, { run: 3, walk: 1, reps: 8 }, { run: 4, walk: 1, reps: 6 },
    { run: 5, walk: 1, reps: 5 }, { run: 8, walk: 1, reps: 4 }, { run: 10, walk: 1, reps: 3 },
    { run: 20, walk: 0, reps: 1 }, { run: 25, walk: 0, reps: 1 }, { run: 30, walk: 0, reps: 1 }
];
const CLASS_TIPS = {
    'Body Pump': ['Calienta hombros y espalda antes de empezar', 'Elige la carga de cada bloque: debe costarte al final de las repeticiones', 'Prioriza la técnica sobre el peso'],
    'Spinning': ['Ajusta sillín y manillar antes de empezar', 'Alterna sentada y de pie', 'Sube resistencia sin perder cadencia'],
    'default': ['Calienta 5 minutos', 'Hidrátate durante la sesión', 'Escucha a tu cuerpo']
};

const kindOf = a => /Pesas|Fuerza/.test(a) ? 'strength' : /Running|Correr|CACOS/.test(a) ? 'run' : /Descanso Total/.test(a) ? 'rest' : /Descanso Activo|Estiramientos/.test(a) ? 'stretch' : 'class';
const card = inner => `<div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">${inner}</div>`;
const doneBanner = txt => `<div class="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3 rounded-xl">✅ ${txt}</div>`;

function getSessions() { return safeParse('dreamfit_sessions', []); }
function addSession(s) {
    const all = getSessions();
    all.unshift({ date: getTodayKey(), ...s });
    DB.setItem('dreamfit_sessions', JSON.stringify(all));
}
function getStrength() { return safeParse('dreamfit_strength', {}); }
function savedToday(kind, type) {
    const s = getSessions().find(x => x.kind === kind && !x.manual && (!type || x.type === type));
    return !!s && s.date === getTodayKey();
}
function completeToday(msg) { setDayCompleted(getTodayKey(), true); showToast(msg); }
function refreshAfterLog() { updateTodayBadge(); renderAgenda(); renderMonthlyCalendar(); loadHistory(); renderEntrenoPanel(); }

function choices(id, opts) {
    return `<div id="${id}" data-v="" class="flex gap-1.5">${opts.map(([v, l]) => `<button type="button" data-v="${v}" onclick="pickChoice(this)" class="flex-1 py-2 rounded-xl border text-[11px] font-semibold cursor-pointer bg-white text-slate-600 border-slate-200">${l}</button>`).join('')}</div>`;
}
function pickChoice(btn) {
    const box = btn.parentElement;
    box.dataset.v = btn.dataset.v;
    [...box.children].forEach(b => {
        const on = b === btn;
        ['bg-emerald-600', 'text-white', 'border-emerald-600'].forEach(c => b.classList.toggle(c, on));
        ['bg-white', 'text-slate-600', 'border-slate-200'].forEach(c => b.classList.toggle(c, !on));
    });
}
const choiceVal = id => document.getElementById(id).dataset.v;

function renderEntrenoTab() {
    const sel = document.getElementById('workout-type');
    const planned = getPlanFor(getTodayKey());
    if (sel.dataset.override !== getTodayKey() && [...sel.options].some(o => o.value === planned)) sel.value = planned;
    renderEntrenoPanel();
}
function onWorkoutTypeChange() {
    document.getElementById('workout-type').dataset.override = getTodayKey();
    renderEntrenoPanel();
}
function renderEntrenoPanel() {
    const planned = getPlanFor(getTodayKey());
    const act = document.getElementById('workout-type').value || planned;
    const kind = kindOf(act);
    document.getElementById('entreno-title').innerText = act;
    document.getElementById('entreno-sub').innerText = act === planned ? 'Es lo que tienes planificado para hoy.' : 'Hoy tenías planificado: ' + planned;
    document.getElementById('routine-focus-tag').innerText = { strength: 'Fuerza', run: 'Base aeróbica', class: 'Clase', stretch: 'Movilidad', rest: 'Recuperación' }[kind];
    const panels = { strength: strengthPanel, run: runPanel, stretch: stretchPanel, rest: restPanel, class: classPanel };
    document.getElementById('entreno-panel').innerHTML = panels[kind](act);
}

// ---- PESAS ----
function suggestWeight(m) {
    const last = (getStrength()[m.name] || [])[0];
    const step = eff().place === 'home' ? 2 : 2.5;
    if (!last) return { w: getLearnedWeights()[m.name] || m.defaultWeight, why: 'Peso inicial recomendado.' };
    if (last.result === 'yes') return { w: last.weight + step, why: `Completaste todo con ${last.weight} kg: sube ${step} kg.` };
    if (last.result === 'no') return { w: Math.max(step, last.weight - step), why: `Costó con ${last.weight} kg: baja ${step} kg.` };
    return { w: last.weight, why: `Casi con ${last.weight} kg: repite para consolidar.` };
}
function strengthPanel() {
    const machines = getDayMachines(getTodayName());
    const hist = getStrength(), today = getTodayKey();
    const isDone = m => (hist[m.name] || [])[0]?.date === today;
    const pending = machines.filter(m => !isDone(m)).length;
    const header = card(`<div class="flex justify-between items-center"><h3 class="font-bold text-sm text-slate-900">Rutina de hoy</h3><span class="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">${machines.filter(isDone).length}/${machines.length} ejercicios</span></div><p class="text-xs text-slate-700 font-semibold">${getScheme().label} · descanso ${getScheme().restLabel} entre series${getProfile() ? ' · ' + GOALS[eff().goal].label : ''}</p><p class="text-xs text-slate-500">Anota cómo te fue en cada ejercicio: la app ajusta el peso de la próxima vez.</p>${pending ? `<button onclick="startWorkout()" class="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm cursor-pointer hover:bg-emerald-700 flex items-center justify-center gap-2"><i class="fa-solid fa-play" aria-hidden="true"></i> ${pending < machines.length ? 'Continuar entrenamiento' : 'Empezar entrenamiento'}</button><p class="text-[10px] text-slate-400 text-center">Modo guiado: serie a serie, con temporizador de descanso. O guarda cada ejercicio a mano aquí abajo.</p>` : ''}`);
    return header + machines.map((m, i) => {
        const sug = suggestWeight(m);
        const top = `<div class="flex justify-between items-start"><h4 class="font-bold text-sm text-slate-900">${m.name}</h4><a href="${m.videoUrl}" target="_blank" rel="noopener" class="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">▶ Vídeo</a></div><p class="text-[11px] text-slate-600"><b>Técnica:</b> ${m.tech}</p>`;
        if (isDone(m)) return card(top + doneBanner(`Guardado hoy: ${hist[m.name][0].weight} kg. Próxima vez: ${sug.w} kg.`));
        return card(top + `
            <p class="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg">💡 ${sug.why}</p>
            <label for="sw-${i}" class="text-xs font-semibold text-slate-500">Peso usado hoy (kg)</label>
            <input type="number" inputmode="decimal" step="0.5" id="sw-${i}" value="${sug.w}" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            ${choices('sr-' + i, [['yes', `✅ Completé ${getScheme().label}`], ['mid', '😅 Casi'], ['no', '❌ No pude']])}
            <button onclick="saveMachine(${i})" class="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-emerald-700">Guardar máquina</button>`);
    }).join('');
}
function saveMachine(i) {
    const w = parseFloat(document.getElementById('sw-' + i).value), r = choiceVal('sr-' + i);
    if (!w || !r) { showToast('Indica el peso y cómo te fue.'); return; }
    commitMachine(i, w, r);
}
// Guarda un ejercicio de fuerza de hoy (lo usan el formulario rápido y el modo entreno). `sets` = [{w, reps}] opcional.
function commitMachine(i, w, r, sets = null) {
    const machines = getDayMachines(getTodayName()), m = machines[i];
    const s = getStrength(), entry = { date: getTodayKey(), weight: w, result: r };
    if (sets) entry.sets = sets;
    (s[m.name] = s[m.name] || []).unshift(entry);
    DB.setItem('dreamfit_strength', JSON.stringify(s));
    addHistory(`💪 [Fuerza] ${m.name}: ${w} kg | ${resultTxt(r)}${sets ? ' · reps ' + sets.map(x => x.reps).join('/') : ''}`);
    if (machines.every(x => s[x.name]?.[0]?.date === getTodayKey())) completeToday('¡Rutina completa! 🏆');
    else showToast(`Guardado: ${m.name} ${w} kg`);
    refreshAfterLog();
}

// ---- RUNNING (CACOS progresivo) ----
const runDesc = L => L.walk ? `${L.run} min trote / ${L.walk} min caminar × ${L.reps}` : `${L.run} min de trote continuo`;
function runPlan() {
    const runs = getSessions().filter(s => s.kind === 'run' && !s.manual);
    if (!runs.length) return { lvl: 0, why: 'Empezamos por la base: ritmo suave en el que puedas hablar.', runs };
    const [a, b] = runs;
    let lvl = a.level, why;
    if (a.feeling === 'hard') {
        if (b && b.level === lvl && b.feeling === 'hard' && lvl > 0) { lvl--; why = 'Dos sesiones duras seguidas: bajamos un nivel para recuperar.'; }
        else why = 'La última fue dura: repite este nivel.';
    } else if (a.feeling === 'easy' && b && b.level === lvl && b.feeling === 'easy' && lvl < RUN_LEVELS.length - 1) {
        lvl++; why = 'Dos sesiones fáciles seguidas: ¡subes de nivel! 🚀';
    } else if (a.feeling === 'easy') why = 'Te sentiste cómoda: una más así y subimos.';
    else why = 'Consolidando este nivel.';
    return { lvl, why, runs };
}
function runPanel() {
    const { lvl, why, runs } = runPlan();
    const L = RUN_LEVELS[lvl], done = savedToday('run');
    const plan = card(`
        <div class="flex justify-between items-center"><h3 class="font-bold text-sm text-slate-900">${done ? 'Próxima sesión' : 'Tu sesión de hoy'}</h3><span class="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">Nivel ${lvl + 1} de ${RUN_LEVELS.length}</span></div>
        <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center"><p class="font-bold text-emerald-900 text-sm">${runDesc(L)}</p><p class="text-[11px] text-emerald-700">≈ ${(L.run + L.walk) * L.reps} minutos en total</p></div>
        <div class="h-2 bg-slate-100 rounded-full"><div class="h-2 bg-emerald-500 rounded-full" style="width:${(lvl + 1) / RUN_LEVELS.length * 100}%"></div></div>
        <p class="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg">💡 ${why}</p>
        <p class="text-[11px] text-slate-500">Regla de oro: debes poder mantener una conversación sin jadear.</p>`);
    const form = done ? card(doneBanner('Sesión de hoy guardada. ¡Buen trabajo!')) : card(`
        <h3 class="font-bold text-sm text-slate-900">¿Cómo te fue?</h3>
        ${choices('run-feel', FEEL)}
        <label for="run-km" class="text-xs font-semibold text-slate-500">Distancia (km, opcional)</label>
        <input type="number" inputmode="decimal" step="0.1" id="run-km" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
        <button onclick="saveRun(${lvl})" class="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-emerald-700">Guardar sesión</button>`);
    const recent = runs.length ? card(`<h3 class="font-bold text-sm text-slate-900">Últimas carreras</h3><div class="text-xs text-slate-600 space-y-1.5">${runs.slice(0, 4).map(r => `<div class="p-2 bg-slate-50 rounded-lg">${r.date} · Nivel ${r.level + 1} · ${FEEL_TXT[r.feeling]}${r.km ? ' · ' + r.km + ' km' : ''}</div>`).join('')}</div>`) : '';
    return plan + form + recent;
}
function saveRun(lvl) {
    const f = choiceVal('run-feel'), km = parseFloat(document.getElementById('run-km').value);
    if (!f) { showToast('Indica cómo te sentiste.'); return; }
    addSession({ kind: 'run', level: lvl, feeling: f, km: km || null });
    addHistory(`🏃 [Entreno] Running nivel ${lvl + 1} (${runDesc(RUN_LEVELS[lvl])}) · ${FEEL_TXT[f]}${km ? ' · ' + km + ' km' : ''}`);
    completeToday('¡Carrera guardada! 🏆');
    refreshAfterLog();
}

// ---- CLASES (Body Pump, Spinning y personalizadas) ----
function classPanel() {
    const act = document.getElementById('workout-type').value;
    const tips = CLASS_TIPS[Object.keys(CLASS_TIPS).find(k => act.includes(k))] || CLASS_TIPS.default;
    const mine = getSessions().filter(s => s.kind === 'class' && s.type === act);
    const last = mine[0];
    const advice = !last ? 'Primera vez: ve a un ritmo cómodo y apunta cómo te sienta.'
        : last.feeling === 'hard' ? 'La última vez fue dura: hoy baja un punto la carga o resistencia y prioriza la técnica.'
        : last.feeling === 'easy' ? 'La última te resultó fácil: hoy puedes subir un poco la intensidad.'
        : 'Mantén la intensidad de la última sesión.';
    const info = card(`<h3 class="font-bold text-sm text-slate-900">Antes de empezar</h3><ul class="text-xs text-slate-600 list-disc pl-4 space-y-1">${tips.map(t => `<li>${t}</li>`).join('')}</ul><p class="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg">💡 ${advice}</p>`);
    const form = savedToday('class', act) ? card(doneBanner('Sesión de hoy guardada. ¡Buen trabajo!')) : card(`
        <h3 class="font-bold text-sm text-slate-900">¿Cómo te fue?</h3>
        ${choices('cls-feel', FEEL)}
        <label for="cls-min" class="text-xs font-semibold text-slate-500">Duración (minutos)</label>
        <input type="number" inputmode="numeric" id="cls-min" value="45" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
        <label for="cls-notes" class="text-xs font-semibold text-slate-500">Notas (opcional)</label>
        <input type="text" id="cls-notes" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
        <button onclick="saveClass()" class="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-emerald-700">Guardar sesión</button>`);
    const recent = mine.length ? card(`<h3 class="font-bold text-sm text-slate-900">Últimas sesiones</h3><div class="text-xs text-slate-600 space-y-1.5">${mine.slice(0, 4).map(s => `<div class="p-2 bg-slate-50 rounded-lg">${s.date} · ${s.minutes} min · ${FEEL_TXT[s.feeling]}${s.notes ? ' · ' + escapeHtml(s.notes) : ''}</div>`).join('')}</div>`) : '';
    return info + form + recent;
}
function saveClass() {
    const type = document.getElementById('workout-type').value, f = choiceVal('cls-feel');
    const minutes = parseInt(document.getElementById('cls-min').value), notes = document.getElementById('cls-notes').value.trim();
    if (!f || !minutes) { showToast('Indica la duración y cómo te sentiste.'); return; }
    addSession({ kind: 'class', type, minutes, feeling: f, notes });
    addHistory(`🏋️ [Entreno] ${type} (${minutes} min) · ${FEEL_TXT[f]}${notes ? ' - ' + notes : ''}`);
    completeToday('¡Sesión guardada! 🏆');
    refreshAfterLog();
}

// ---- DESCANSO ACTIVO / TOTAL ----
const STRETCHES = ['Cuello y hombros · 30 s por lado', 'Pecho en la pared · 30 s por lado', 'Postura del niño (espalda) · 45 s', 'Cuádriceps de pie · 30 s por pierna', 'Isquios sentada · 45 s', 'Glúteo (figura 4) · 30 s por lado', 'Gemelos en la pared · 30 s por pierna'];
function stretchPanel() {
    if (savedToday('stretch')) return card(doneBanner('Estiramientos de hoy hechos. ¡Genial!'));
    return card(`<h3 class="font-bold text-sm text-slate-900">Rutina de movilidad (≈10 min)</h3>
        <div class="space-y-1.5">${STRETCHES.map((s, i) => `<label class="flex items-center gap-2 p-2 bg-slate-50 rounded-lg text-xs text-slate-700 cursor-pointer"><input type="checkbox" class="w-4 h-4 text-emerald-600 rounded">${s}</label>`).join('')}</div>
        <button onclick="saveStretch()" class="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-emerald-700">Marcar como hecho</button>`);
}
function saveStretch() {
    addSession({ kind: 'stretch' });
    addHistory('🧘 [Entreno] Descanso activo / Estiramientos');
    completeToday('¡Movilidad completada! 🏆');
    refreshAfterLog();
}
function restPanel() {
    return card(`<h3 class="font-bold text-sm text-slate-900">Hoy toca recuperar 😴</h3>
        <p class="text-xs text-slate-600">Duerme 7-8 horas, mantén la hidratación y, si te apetece, da un paseo suave. El músculo crece mientras descansas.</p>
        <button onclick="document.querySelector('#tab-entreno details').open = true" class="text-xs text-emerald-700 font-semibold underline cursor-pointer">¿Has entrenado igualmente? Cambia la actividad de hoy</button>`);
}
