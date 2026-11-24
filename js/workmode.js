// ===== MODO ENTRENO: pesas en primer plano, serie a serie, con temporizador de descanso =====
// Pantalla completa: un ejercicio cada vez, una fila por serie (peso y repeticiones) y, al marcar una serie,
// arranca el descanso del objetivo (js/plan.js). Al completar un ejercicio se guarda con commitMachine().
let wk = null;

const wkRange = r => { const m = String(r).match(/(\d+)(?:\D+(\d+))?/); return { min: +m[1], max: +(m[2] || m[1]) }; };
const wkFmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
const wkSoundOn = () => DB.getItem('dreamfit_rest_sound') !== '0';
const wkNum = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : NaN; };

function startWorkout(at) { // at = ejercicio concreto de la lista; sin él, el primero pendiente
    if (wk) return;
    const machines = getDayMachines(getTodayName()), sc = getScheme(), hist = getStrength(), today = getTodayKey();
    const done = machines.map(m => (hist[m.name] || [])[0]?.date === today), range = wkRange(sc.reps);
    wk = { machines, sc, range, done, idx: Number.isInteger(at) && at >= 0 && at < machines.length ? at : Math.max(0, done.indexOf(false)), sets: machines.map(m => { const w = suggestWeight(m).w; return Array.from({ length: sc.sets }, () => ({ w, reps: range.max, ok: false })); }),
        summary: {}, restEnd: 0, restTotal: 0, alerted: true, timer: null, prev: document.activeElement, ac: null, lock: null };
    document.getElementById('wk-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    wkWake();
    renderWorkout();
}
async function wkWake() { try { if (navigator.wakeLock) wk.lock = await navigator.wakeLock.request('screen'); } catch (e) { /* no disponible: no pasa nada */ } }
document.addEventListener('visibilitychange', () => { if (wk && !document.hidden) { wkWake(); wkTick(); } });

async function wkExit(force) {
    if (!wk) return;
    const partial = wk.machines.map((m, i) => !wk.done[i] && wk.sets[i].some(s => s.ok) ? m.name : null).filter(Boolean);
    if (partial.length && !force && !await UI.confirm({ title: '¿Salir del entrenamiento?', message: `Tienes series sin guardar en «${partial[0]}». Si sales ahora se perderán; pulsa «Terminar ejercicio» para guardarlas.`, confirmText: 'Salir sin guardar', cancelText: 'Seguir entrenando', tone: 'danger' })) return;
    clearInterval(wk.timer);
    try { if (wk.lock) wk.lock.release(); } catch (e) { /* ya liberado */ }
    try { if (wk.ac) wk.ac.close(); } catch (e) { /* ya cerrado */ }
    document.getElementById('wk-modal').classList.add('hidden');
    document.body.style.overflow = '';
    const prev = wk.prev; wk = null;
    if (prev && document.contains(prev)) prev.focus();
    renderEntrenoPanel();
}

// ---- series ----
function wkField(si, f, v) { wk.sets[wk.idx][si][f] = wkNum(v); } // sin repintar, para no perder el foco al escribir
function wkAddSet() { const a = wk.sets[wk.idx], l = a[a.length - 1]; a.push({ w: l.w, reps: l.reps, ok: false }); renderWorkout('add:' + (a.length - 1)); }
function wkMark(si) {
    const set = wk.sets[wk.idx][si];
    if (set.ok) { set.ok = false; renderWorkout('check:' + si); return; } // deshacer
    if (!(set.w > 0) || !(set.reps > 0)) { showToast('Indica el peso y las repeticiones de la serie.'); return; }
    set.ok = true;
    try { // el audio solo se puede iniciar tras un toque: lo preparamos aquí
        if (!wk.ac && wkSoundOn()) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) wk.ac = new AC(); }
        if (wk.ac && wk.ac.state === 'suspended') wk.ac.resume();
    } catch (e) { /* sin sonido */ }
    const allOk = wk.sets[wk.idx].every(s => s.ok);
    if (allOk) wkFinish(); else { wkRest(wk.sc.rest); renderWorkout('check:' + Math.min(si + 1, wk.sets[wk.idx].length - 1)); }
}
function wkVerdict() {
    const ok = wk.sets[wk.idx].filter(s => s.ok), planned = wk.sc.sets, { min, max } = wk.range;
    const ratio = Math.min(1, ok.reduce((t, s) => t + s.reps, 0) / (planned * max));
    return ok.length >= planned && ok.every(s => s.reps >= max) ? 'yes' : ratio >= 0.75 ? 'mid' : 'no';
}
function wkFinish() {
    const i = wk.idx, ok = wk.sets[i].filter(s => s.ok);
    if (!ok.length) { showToast('Marca al menos una serie.'); return; }
    const w = Math.max(...ok.map(s => s.w)), r = wkVerdict();
    commitMachine(i, w, r, ok.map(s => ({ w: s.w, reps: s.reps })));
    wk.done[i] = true;
    wk.summary[i] = { w, r, next: suggestWeight(wk.machines[i]) };
    if (wk.done.every(Boolean)) { wkStopRest(); renderWorkout(); } // rutina completa
    else { wkRest(wk.sc.rest); renderWorkout('next'); }
}
function wkGo(d) { // d = +1 / -1
    wk.idx = Math.min(wk.machines.length - 1, Math.max(0, wk.idx + d)); renderWorkout('top');
}
function wkJump(i) { wk.idx = i; renderWorkout('top'); }
function wkNext() { // siguiente ejercicio pendiente
    const n = wk.machines.length;
    for (let k = 1; k <= n; k++) { const j = (wk.idx + k) % n; if (!wk.done[j]) { wk.idx = j; break; } }
    renderWorkout('top');
}
function wkToggleSound() { DB.setItem('dreamfit_rest_sound', wkSoundOn() ? '0' : '1'); renderWorkout(); }

// ---- descanso ----
function wkRest(sec) { wk.restTotal = sec; wk.restEnd = Date.now() + sec * 1000; wk.alerted = false; if (!wk.timer) wk.timer = setInterval(wkTick, 250); }
function wkStopRest() { wk.restEnd = 0; wk.alerted = true; clearInterval(wk.timer); wk.timer = null; wkPaintTimer(); }
function wkAdjust(d) {
    if (!wk.restEnd) return;
    const now = Date.now();
    if (wk.alerted) { wk.restTotal = Math.max(5, d); wk.restEnd = now + wk.restTotal * 1000; wk.alerted = false; if (!wk.timer) wk.timer = setInterval(wkTick, 250); }
    else { wk.restEnd = Math.max(now + 1000, wk.restEnd + d * 1000); wk.restTotal = Math.max(wk.restTotal, Math.ceil((wk.restEnd - now) / 1000)); }
    wkTick();
}
function wkTick() {
    if (!wk) return;
    if (wk.restEnd && !wk.alerted && Date.now() >= wk.restEnd) {
        wk.alerted = true;
        wkAlert();
    }
    wkPaintTimer();
}
function wkAlert() {
    if (wkSoundOn()) {
        try {
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            if (wk.ac) [0, 0.28, 0.56].forEach(t => {
                const o = wk.ac.createOscillator(), g = wk.ac.createGain(), at = wk.ac.currentTime + t;
                o.frequency.value = 880; o.connect(g); g.connect(wk.ac.destination);
                g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.25, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
                o.start(at); o.stop(at + 0.25);
            });
        } catch (e) { /* sin sonido */ }
    }
    const live = document.getElementById('wk-live'); if (live) live.innerText = 'Descanso terminado. Siguiente serie.';
}
function wkPaintTimer() {
    const box = document.getElementById('wk-timer'); if (!box) return;
    const left = wk.restEnd ? Math.max(0, Math.ceil((wk.restEnd - Date.now()) / 1000)) : 0;
    const running = wk.restEnd && !wk.alerted, finished = wk.restEnd && wk.alerted;
    box.dataset.state = running ? 'run' : finished ? 'done' : 'idle';
    box.className = 'rounded-2xl p-3 flex items-center gap-3 transition-colors ' + (running ? 'bg-slate-800 text-white' : finished ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500');
    document.getElementById('wk-time').innerText = running ? wkFmt(left) : finished ? '¡Ya!' : wkFmt(wk.sc.rest);
    document.getElementById('wk-label').innerText = running ? 'Descansando…' : finished ? 'A por la siguiente serie' : 'Descanso entre series';
    document.getElementById('wk-bar').style.width = running ? Math.max(0, Math.min(100, left / wk.restTotal * 100)) + '%' : finished ? '100%' : '0%';
    ['wk-m15', 'wk-p15', 'wk-skip'].forEach(id => { document.getElementById(id).disabled = !wk.restEnd; });
    document.getElementById('wk-skip').innerText = finished ? 'Cerrar' : 'Saltar';
}

// ---- pantalla ----
function renderWorkout(focus) {
    const root = document.getElementById('wk-modal'), body = root.querySelector('[data-wk-body]'), keep = body ? body.scrollTop : 0;
    const i = wk.idx, m = wk.machines[i], sets = wk.sets[i], n = wk.machines.length, sc = wk.sc, isDone = wk.done[i];
    const doneCount = wk.done.filter(Boolean).length, all = doneCount === n;
    const stepper = wk.machines.map((x, k) => `<button onclick="wkJump(${k})" aria-label="Ejercicio ${k + 1}: ${escapeHtml(x.name)}${wk.done[k] ? ' (hecho)' : ''}" ${k === i ? 'aria-current="step"' : ''} class="flex-1 h-9 rounded-lg text-xs font-bold cursor-pointer ${wk.done[k] ? 'bg-emerald-500 text-white' : k === i ? 'bg-white text-slate-900 ring-2 ring-emerald-400' : 'bg-slate-700 text-slate-300'}">${wk.done[k] ? '✓' : k + 1}</button>`).join('');
    const head = `
        <div class="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 space-y-3">
            <div class="flex items-center justify-between gap-2">
                <div><h2 id="wk-title" class="font-bold text-base leading-tight">Entrenamiento de fuerza</h2><p class="text-[11px] text-slate-300">${doneCount}/${n} ejercicios · ${sc.label} · descanso ${sc.restLabel}</p></div>
                <div class="flex gap-1.5">
                    <button onclick="wkToggleSound()" aria-label="Sonido y vibración del descanso: ${wkSoundOn() ? 'activados' : 'desactivados'}" aria-pressed="${wkSoundOn()}" class="w-10 h-10 rounded-xl bg-slate-700 text-sm cursor-pointer"><i class="fa-solid ${wkSoundOn() ? 'fa-bell' : 'fa-bell-slash'}" aria-hidden="true"></i></button>
                    <button onclick="wkExit()" aria-label="Salir del entrenamiento" class="w-10 h-10 rounded-xl bg-slate-700 text-sm cursor-pointer"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
                </div>
            </div>
            <div class="flex gap-1.5">${stepper}</div>
        </div>`;
    let main;
    if (all) {
        const list = wk.machines.map((x, k) => { const sm = wk.summary[k]; return `<div class="flex justify-between gap-2 p-2.5 bg-white rounded-xl border border-slate-100 text-xs"><span class="font-semibold text-slate-800">${escapeHtml(x.name)}</span><span class="text-slate-500 whitespace-nowrap">${sm ? sm.w + ' kg · ' + resultTxt(sm.r) : 'ya guardado'}</span></div>`; }).join('');
        main = `<div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-1"><p class="text-3xl" aria-hidden="true">🏆</p><h3 class="font-bold text-lg text-emerald-900">¡Rutina completa!</h3><p class="text-xs text-emerald-800">Has terminado todos los ejercicios de hoy. Descansa y bebe agua 💧</p></div>
            <div class="space-y-1.5">${list}</div>
            <button onclick="wkExit(true)" class="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm cursor-pointer">Cerrar</button>`;
    } else {
        const sug = suggestWeight(m), sm = wk.summary[i];
        const rows = sets.map((s, k) => `
            <div class="flex items-center gap-2 p-2 rounded-xl border ${s.ok ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'}">
                <span class="w-12 text-[11px] font-bold ${s.ok ? 'text-emerald-700' : 'text-slate-500'}">Serie ${k + 1}</span>
                <label class="flex-1 min-w-0"><span class="sr-only">Peso de la serie ${k + 1} (kg)</span>
                    <div class="flex items-center gap-1"><input type="number" inputmode="decimal" step="0.5" min="0" value="${s.w}" ${s.ok || isDone ? 'disabled' : ''} oninput="wkField(${k}, 'w', this.value)" class="w-full min-w-0 px-2 py-2.5 text-center text-base font-bold bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-60"><span class="text-[11px] text-slate-500">kg</span></div></label>
                <label class="flex-1 min-w-0"><span class="sr-only">Repeticiones de la serie ${k + 1}</span>
                    <div class="flex items-center gap-1"><input type="number" inputmode="numeric" step="1" min="0" value="${s.reps}" ${s.ok || isDone ? 'disabled' : ''} oninput="wkField(${k}, 'reps', this.value)" class="w-full min-w-0 px-2 py-2.5 text-center text-base font-bold bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-60"><span class="text-[11px] text-slate-500">rep</span></div></label>
                <button data-wk="check:${k}" onclick="wkMark(${k})" ${isDone ? 'disabled' : ''} aria-pressed="${s.ok}" aria-label="${s.ok ? 'Deshacer' : 'Marcar como hecha'} la serie ${k + 1}" class="w-11 h-11 shrink-0 rounded-xl text-lg font-bold cursor-pointer ${s.ok ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-emerald-100'} disabled:opacity-60"><i class="fa-solid fa-check" aria-hidden="true"></i></button>
            </div>`).join('');
        const anyOk = sets.some(s => s.ok);
        const summary = sm ? `<div class="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3 rounded-xl space-y-1"><p>✅ Guardado: ${sm.w} kg · ${resultTxt(sm.r)}</p><p class="font-normal">Próxima vez: ${sm.next.w} kg. ${sm.next.why}</p></div>
            <button onclick="wkNext()" class="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm cursor-pointer">Siguiente ejercicio <i class="fa-solid fa-arrow-right ml-1" aria-hidden="true"></i></button>`
            : isDone ? `<div class="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3 rounded-xl">✅ Este ejercicio ya está guardado hoy.</div>`
            : `<div class="flex gap-2"><button onclick="wkAddSet()" class="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-xs cursor-pointer">+ Añadir serie</button>${anyOk ? `<button onclick="wkFinish()" class="flex-1 bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer">Terminar ejercicio</button>` : ''}</div>`;
        main = `
            <div class="space-y-1">
                <p class="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Ejercicio ${i + 1} de ${n}</p>
                <h3 class="font-bold text-xl text-slate-900 leading-tight">${escapeHtml(m.name)}</h3>
                <p class="text-xs text-slate-600"><b>${sc.sets} series × ${sc.reps} repeticiones</b> · descanso ${sc.restLabel}</p>
            </div>
            <div class="bg-white border border-slate-100 rounded-2xl p-4 space-y-2.5"><h4 class="text-xs font-bold text-slate-900">Cómo se hace</h4>${typeof techniqueAnim === 'function' && m.role ? techniqueAnim(m.role, m.place || 'gym', m.muscles) : ''}${typeof exerciseFigure === 'function' ? exerciseFigure(m.muscles) : ''}<p class="text-xs text-slate-600">${escapeHtml(m.tech)}</p>${m.err ? `<p class="text-[11px] text-red-700 bg-red-50 p-2 rounded-lg">⚠️ Error típico: ${escapeHtml(m.err)}</p>` : ''}<a href="${escapeHtml(m.videoUrl)}" target="_blank" rel="noopener" class="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 font-bold text-xs py-2.5 rounded-xl"><i class="fa-solid fa-play" aria-hidden="true"></i> Ver vídeo del ejercicio</a>${m.moreUrl ? `<a href="${escapeHtml(m.moreUrl)}" target="_blank" rel="noopener" class="block text-center text-[11px] text-slate-500 underline">Ver más vídeos</a>` : ''}</div>
            ${isDone ? '' : `<p class="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg">💡 ${sug.why}</p>`}
            <div class="space-y-2" role="group" aria-label="Series">${rows}</div>
            ${summary}`;
    }
    const foot = all ? '' : `
        <div class="px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white border-t border-slate-200 space-y-2">
            <div id="wk-timer" class="rounded-2xl p-3 flex items-center gap-3" data-state="idle">
                <div class="flex-1 min-w-0"><p id="wk-label" class="text-[11px] font-semibold"></p><p id="wk-time" class="text-3xl font-bold tabular-nums leading-none mt-0.5"></p>
                    <div class="h-1.5 bg-white/20 rounded-full mt-2 overflow-hidden"><div id="wk-bar" class="h-1.5 bg-emerald-400 rounded-full" style="width:0%"></div></div></div>
                <div class="flex gap-1.5 text-[11px] font-bold">
                    <button id="wk-m15" onclick="wkAdjust(-15)" aria-label="Restar 15 segundos" class="px-2.5 py-2 rounded-lg bg-white/15 cursor-pointer disabled:opacity-40">−15</button>
                    <button id="wk-p15" onclick="wkAdjust(15)" aria-label="Sumar 15 segundos" class="px-2.5 py-2 rounded-lg bg-white/15 cursor-pointer disabled:opacity-40">+15</button>
                    <button id="wk-skip" onclick="wkStopRest()" class="px-2.5 py-2 rounded-lg bg-white/15 cursor-pointer disabled:opacity-40">Saltar</button>
                </div>
            </div>
            <div class="flex gap-2 text-xs font-bold">
                <button onclick="wkGo(-1)" ${i === 0 ? 'disabled' : ''} class="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 cursor-pointer disabled:opacity-40"><i class="fa-solid fa-arrow-left mr-1" aria-hidden="true"></i>Anterior</button>
                <button onclick="wkGo(1)" ${i === n - 1 ? 'disabled' : ''} class="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 cursor-pointer disabled:opacity-40">Siguiente<i class="fa-solid fa-arrow-right ml-1" aria-hidden="true"></i></button>
            </div>
        </div>`;
    root.innerHTML = head + `<div data-wk-body class="flex-1 overflow-y-auto px-4 py-4 space-y-4">${main}</div>` + foot + '<p id="wk-live" class="sr-only" aria-live="polite"></p>';
    const nb = root.querySelector('[data-wk-body]');
    nb.scrollTop = (focus === 'top' || focus === 'next') ? 0 : keep;
    wkPaintTimer();
    const f = focus && /^(check|add):/.test(focus) ? root.querySelector(`[data-wk="check:${focus.split(':')[1]}"]`) : null;
    if (f && !f.disabled) f.focus({ preventScroll: true });
}
