// ===== BIENVENIDA: objetivo, nivel, días y lugar =====
// Al crear la cuenta (o desde Perfil) se elige un perfil y la app monta la semana y las rutinas (js/plan.js).
let ob = null; // { first, goal, level, days, place }

function openOnboarding(first) {
    const cur = getProfile();
    ob = { first: !!first, goal: cur?.goal || null, level: cur?.level || null, days: cur?.days || 3, place: cur?.place || 'gym', prev: document.activeElement };
    renderOnboarding();
    document.getElementById('ob-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('ob-sheet').scrollTop = 0;
    const f = document.querySelector('#ob-sheet [data-ob]'); if (f) f.focus();
}
function closeOnboarding() {
    document.getElementById('ob-modal').classList.add('hidden');
    document.body.style.overflow = '';
    if (ob?.prev && document.contains(ob.prev)) ob.prev.focus();
    ob = null;
}
function obSet(k, v) { ob[k] = v; renderOnboarding(); const e = document.querySelector(`#ob-sheet [data-ob="${k}:${v}"]`); if (e) e.focus(); }
function skipOnboarding() {
    if (ob.first) DB.setItem('dreamfit_profile', JSON.stringify({ skipped: true, ts: Date.now() })); // no volver a preguntar
    closeOnboarding();
}
async function confirmOnboarding() {
    if (!ob.goal || !ob.level) return;
    if (!ob.first && !await UI.confirm({ title: '¿Cambiar tu plan?', message: 'Se reorganizará tu semana de entrenos y las rutinas. Tu historial y tus pesos guardados se conservan.', confirmText: 'Cambiar plan', tone: 'warn', icon: 'fa-wand-magic-sparkles' })) return;
    applyProfile(ob);
    const g = GOALS[ob.goal];
    closeOnboarding();
    showToast(`¡Plan listo! ${g.emoji} ${g.label}`);
}
const obChip = (k, v, on, inner, cls = '') => `<button type="button" role="radio" aria-checked="${on}" data-ob="${k}:${v}" onclick="obSet('${k}', ${typeof v === 'number' ? v : `'${v}'`})" class="${cls} rounded-xl border text-left cursor-pointer transition ${on ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-white border-slate-200 hover:border-emerald-300'}">${inner}</button>`;
function renderOnboarding() {
    const s = ob, ready = s.goal && s.level;
    const goals = Object.entries(GOALS).map(([id, g]) => obChip('goal', id, s.goal === id, `<span class="text-lg">${g.emoji}</span><span class="block font-bold text-xs text-slate-900">${g.label}</span><span class="block text-[10px] text-slate-500 leading-tight">${g.desc}</span>`, 'p-3 flex flex-col justify-start')).join('');
    const levels = Object.entries(LEVELS).map(([id, l]) => obChip('level', id, s.level === id, `<span class="font-bold text-xs text-slate-900">${l.label}</span> <span class="text-[11px] text-slate-500">· ${l.desc}</span>`, 'px-3 py-2.5 w-full block')).join('');
    const days = [2, 3, 4, 5].map(d => obChip('days', d, s.days === d, `<span class="block text-center font-bold text-sm text-slate-900">${d}</span>`, 'flex-1 py-2.5')).join('');
    const places = Object.entries(PLACES).map(([id, l]) => obChip('place', id, s.place === id, `<span class="block text-center font-semibold text-xs text-slate-800">${l}</span>`, 'flex-1 py-2.5 px-2')).join('');
    let preview = '<p class="text-[11px] text-slate-500">Elige tu objetivo y tu nivel para ver tu plan.</p>';
    if (ready) {
        const p = { goal: s.goal, level: s.level, days: s.days, place: s.place }, sc = getScheme(p), ag = planAgenda(p);
        const short = a => /Pesas|Fuerza/.test(a) ? '🏋️' : /Running/.test(a) ? '🏃' : /Spinning/.test(a) ? '🚴' : /Activo/.test(a) ? '🧘' : '😴';
        preview = `<div class="flex gap-1">${daysOfWeek.map(d => `<div class="flex-1 text-center bg-white rounded-lg border border-emerald-100 py-1.5" title="${ag[d].activity}"><span class="block text-[9px] font-bold text-slate-500">${d[0]}</span><span class="text-sm" aria-hidden="true">${short(ag[d].activity)}</span><span class="sr-only">${d}: ${ag[d].activity}</span></div>`).join('')}</div>
            <p class="text-[11px] text-slate-700 mt-2"><b>${planRoutines(p)[0].length} ejercicios</b> por sesión · <b>${sc.label}</b> · descanso <b>${sc.restLabel}</b></p>
            <p class="text-[11px] text-emerald-800 mt-1">💡 ${GOALS[s.goal].tip}</p>`;
    }
    document.getElementById('ob-sheet').innerHTML = `
        <div class="space-y-1">
            <h2 id="ob-title" class="text-lg font-bold text-slate-900">${s.first ? '¡Bienvenida! Cuéntanos tu objetivo 🎯' : 'Tu objetivo y tu plan'}</h2>
            <p class="text-xs text-slate-500">Con esto montamos tu semana y tus rutinas. Podrás cambiarlo cuando quieras desde Perfil.</p>
        </div>
        <div role="radiogroup" aria-label="Objetivo" class="space-y-2"><h3 class="text-xs font-bold text-slate-700">1. ¿Cuál es tu objetivo?</h3><div class="grid grid-cols-2 gap-2">${goals}</div></div>
        <div role="radiogroup" aria-label="Nivel" class="space-y-2"><h3 class="text-xs font-bold text-slate-700">2. ¿Qué nivel tienes?</h3><div class="space-y-1.5">${levels}</div></div>
        <div role="radiogroup" aria-label="Días por semana" class="space-y-2"><h3 class="text-xs font-bold text-slate-700">3. ¿Cuántos días a la semana entrenas fuerza?</h3><div class="flex gap-2">${days}</div></div>
        <div role="radiogroup" aria-label="Dónde entrenas" class="space-y-2"><h3 class="text-xs font-bold text-slate-700">4. ¿Dónde entrenas?</h3><div class="flex gap-2">${places}</div></div>
        <div class="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3"><h3 class="text-xs font-bold text-emerald-900 mb-2">Tu semana</h3><div id="ob-preview" aria-live="polite">${preview}</div></div>
        <div class="space-y-2">
            <button id="ob-ok" onclick="confirmOnboarding()" ${ready ? '' : 'disabled'} class="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm cursor-pointer hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed">${s.first ? 'Crear mi plan' : 'Guardar plan'}</button>
            <button id="ob-skip" onclick="skipOnboarding()" class="w-full text-xs text-slate-500 font-semibold py-2 cursor-pointer">${s.first ? 'Omitir por ahora' : 'Cancelar'}</button>
            ${s.first ? '<p class="text-[10px] text-slate-400 text-center">Si ya tenías una semana configurada, se reemplazará por esta.</p>' : ''}
        </div>`;
}

// Tarjeta en Perfil
function renderGoalCard() {
    const el = document.getElementById('goal-card');
    if (!el) return;
    const p = getProfile();
    if (!p) { el.innerHTML = `<h3 class="font-bold text-sm text-slate-900">Mi objetivo</h3><p class="text-xs text-slate-500">Aún no has elegido objetivo. Con él adaptamos tu semana, las series y las repeticiones.</p>
        <button onclick="openOnboarding(false)" class="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-emerald-700">Elegir mi objetivo</button>`; return; }
    const g = GOALS[p.goal], sc = getScheme(p);
    el.innerHTML = `<h3 class="font-bold text-sm text-slate-900">Mi objetivo</h3>
        <div class="flex items-center gap-3"><span class="text-2xl" aria-hidden="true">${g.emoji}</span><div><p class="font-bold text-sm text-slate-900">${g.label}</p><p class="text-[11px] text-slate-500">${LEVELS[p.level].label} · ${p.days} días de fuerza · ${PLACES[p.place]}</p></div></div>
        <p class="text-[11px] text-slate-700">Series y repeticiones: <b>${sc.label}</b> · descanso <b>${sc.restLabel}</b></p>
        <p class="text-[11px] text-emerald-800 bg-emerald-50 rounded-lg p-2">💡 ${g.tip}</p>
        <button onclick="openOnboarding(false)" class="w-full bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-slate-200">Cambiar objetivo o plan</button>`;
}
