// ===== RESUMEN SEMANAL Y AJUSTE DEL PLAN =====
// Resumen: qué planificaste y qué hiciste de lunes a domingo (entrenos, km, peso, calorías, agua).
// Ajuste: cada ~2 semanas mira tu tendencia de peso y lo que cumples, y PROPONE cambios (tú aceptas o no).
// Todo se calcula con lo que ya está guardado: no usa IA ni red.

const addDays = (key, n) => { const d = dateFromKey(key); return formatDateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); };
function weekStart(back = 0) { return shiftDays(-((new Date().getDay() + 6) % 7) - 7 * back); } // lunes de esta semana (back = 0) o de las anteriores
const avgOf = a => a.length ? a.reduce((t, v) => t + v, 0) / a.length : null;

// Datos de una semana (lunes..domingo). Solo cuenta lo que ya ha pasado (hasta hoy).
function weekStats(start) {
    const today = getTodayKey(), agenda = getAgenda(), ov = getOverrides(), days = getDays(), log = getLog(), kinds = doneKindsByDate(), runs = getSessions().filter(s => s.kind === 'run');
    const keys = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const cells = [], kcal = [], prot = [], water = [];
    let planned = 0, plannedPast = 0, donePlanned = 0, extra = 0, strength = 0, km = 0;
    keys.forEach(k => {
        const past = k <= today, kind = kindOf(getPlanFor(k, agenda, ov)), isPlan = kind === 'strength' || kind === 'run' || kind === 'class';
        const done = past && !!log[k], set = kinds[k] || new Set();
        if (isPlan) { planned++; if (past && k < today) plannedPast++; }
        if (done) { if (isPlan) donePlanned++; else extra++; }
        if (past && set.has('strength')) strength++;
        if (past) km += runs.filter(r => r.date === k).reduce((t, r) => t + (r.km || 0), 0);
        const st = days[k] || {};
        if (past && st.kcal > 0) kcal.push(st.kcal);
        if (past && st.protein > 0) prot.push(st.protein);
        if (past && st.water > 0) water.push(st.water);
        cells.push({ key: k, past, today: k === today, plan: isPlan, done, kinds: sortKinds(set), planKind: kind });
    });
    // adherencia: los días planificados que ya pasaron (hoy cuenta solo si ya lo hiciste)
    const todayPlannedDone = cells.some(c => c.today && c.plan && c.done);
    const due = plannedPast + (todayPlannedDone ? 1 : 0);
    // peso: último registro de la semana frente al último anterior a ella (o el primero de la semana)
    const end = keys[6] < today ? keys[6] : today, ws = getWeights(); // más reciente primero
    const inWeek = ws.filter(e => e.date >= start && e.date <= end), before = ws.find(e => e.date < start);
    let wLast = inWeek[0] || null, wDelta = null;
    if (wLast) { const base = before || (inWeek.length > 1 ? inWeek[inWeek.length - 1] : null); if (base && base.date !== wLast.date) wDelta = wLast.kg - base.kg; }
    return { start, cells, planned, due, donePlanned, extra, strength, km, wLast, wDelta,
        kcal: avgOf(kcal), protein: avgOf(prot), nutDays: kcal.length, water: avgOf(water), waterDays: water.length };
}

function weekPhrase(s) {
    if (!s.planned) return 'Semana sin entrenos planificados: descansar también es parte del plan.';
    if (!s.due) return 'La semana acaba de empezar. Elige un entreno y hazlo hoy: lo difícil es empezar.';
    const r = s.donePlanned / s.due;
    if (r >= 1) return '¡Semana perfecta! Has cumplido todo lo planificado. 🎉';
    if (r >= 0.75) return 'Muy buena semana. La constancia es lo que da resultados.';
    if (r >= 0.5) return 'Buena base. Con un entreno más la próxima semana subes otro escalón.';
    if (r > 0) return 'Cada sesión suma. Empieza la próxima por el día que más te apetezca.';
    return 'Esta semana no ha salido, y no pasa nada. Haz hoy algo pequeño (10 minutos) y retomas el ritmo.';
}
function weekNotes(s) { // frases cortas sobre calorías y peso respecto a tu objetivo
    const out = [], n = myNutrition(), p = getProfile();
    if (n && s.nutDays >= 3) {
        const r = s.kcal / n.kcal;
        out.push(r > 1.1 ? `Has comido de media un ${Math.round((r - 1) * 100)} % por encima de tu objetivo de calorías.`
            : r < 0.85 ? `Has comido de media un ${Math.round((1 - r) * 100)} % por debajo de tu objetivo: no te quedes corta/o, tu cuerpo necesita energía.`
            : 'Tus calorías han estado en la zona de tu objetivo. 👌');
        if (s.protein && s.protein < n.protein * 0.8) out.push('La proteína se ha quedado corta: añade una ración (huevos, yogur, atún o legumbres) en alguna comida.');
    } else if (n && trackingOn()) out.push('Anota calorías al menos 3 días y aquí verás tu media y cómo vas respecto a tu objetivo.');
    if (p && s.wDelta !== null && Math.abs(s.wDelta) >= 0.1) {
        const good = (p.goal === 'fat' && s.wDelta < 0) || (p.goal === 'muscle' && s.wDelta > 0);
        if (good) out.push('Tu peso se mueve en la dirección de tu objetivo.');
    }
    return out;
}

let summaryBack = 0; // 0 = esta semana, 1 = la anterior
function setSummaryWeek(n) { summaryBack = n; renderWeekSummary(); }
function renderWeekSummary() {
    const el = document.getElementById('week-summary'); if (!el) return;
    const start = weekStart(summaryBack), s = weekStats(start), p = getProfile();
    const d0 = dateFromKey(start), d1 = dateFromKey(addDays(start, 6));
    const range = `${d0.getDate()} ${monthNames[d0.getMonth()].slice(0, 3).toLowerCase()} – ${d1.getDate()} ${monthNames[d1.getMonth()].slice(0, 3).toLowerCase()}`;
    const letters = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const strip = s.cells.map((c, i) => {
        const dot = c.done ? (c.kinds[0] ? KIND_INFO[c.kinds[0]].dot : 'bg-emerald-500') : '';
        const mark = c.done ? `<span class="w-5 h-5 rounded-full ${dot} inline-block" aria-hidden="true"></span>`
            : c.plan && c.past && !c.today ? `<span class="w-5 h-5 rounded-full border-2 border-dashed border-slate-300 inline-block" aria-hidden="true"></span>`
            : `<span class="w-2 h-2 rounded-full ${c.plan ? 'bg-slate-300' : 'bg-slate-200'} inline-block" aria-hidden="true"></span>`;
        const state = c.done ? 'entreno hecho' : c.plan && c.past && !c.today ? 'entreno planificado sin hacer' : c.plan ? 'entreno planificado' : 'descanso';
        return `<div role="img" aria-label="${letters[i]} ${dateFromKey(c.key).getDate()}: ${state}" class="flex flex-col items-center gap-1.5"><span class="h-5 flex items-center">${mark}</span><span class="text-[10px] ${c.today ? 'font-bold text-emerald-700' : 'text-slate-500'}">${letters[i]}</span></div>`;
    }).join('');
    const pct = s.due ? Math.min(100, Math.round(s.donePlanned / s.due * 100)) : 0;
    const wTone = !p || s.wDelta === null ? 'text-slate-900' : (p.goal === 'fat' && s.wDelta < 0) || (p.goal === 'muscle' && s.wDelta > 0) ? 'text-emerald-700' : 'text-slate-900';
    const n = myNutrition();
    const tiles = [
        statTile(`${s.donePlanned} / ${s.planned}`, s.extra ? `entrenos planificados · +${s.extra} extra` : 'entrenos planificados'),
        statTile(String(trim1(s.km)).replace('.', ','), 'km corridos'),
        `<div class="bg-slate-50 rounded-xl p-3 text-center"><p class="text-lg font-bold ${wTone}">${s.wDelta === null ? '—' : fmtDelta(s.wDelta) + ' kg'}</p><p class="text-[10px] text-slate-500">${s.wDelta === null ? (s.wLast ? 'peso: faltan datos para comparar' : 'sin peso esta semana') : 'cambio de peso'}</p></div>`,
        statTile(s.nutDays ? fmtN(s.kcal) : '—', s.nutDays ? `kcal de media${n ? ' (objetivo ' + fmtN(n.kcal) + ')' : ''}` : 'sin calorías anotadas')
    ].join('');
    const extras = [];
    if (s.strength) extras.push(`${s.strength} sesión${s.strength === 1 ? '' : 'es'} de fuerza`);
    if (s.protein) extras.push(`${Math.round(s.protein)} g de proteína de media`);
    if (s.waterDays) extras.push(`${String(trim1(s.water)).replace('.', ',')} vasos de agua al día (meta ${waterGoal()})`);
    el.innerHTML = `<div class="flex items-center justify-between gap-2">
            <h2 class="font-bold text-base text-slate-900 flex items-center gap-2"><i class="fa-solid fa-calendar-week text-emerald-600" aria-hidden="true"></i> Resumen semanal</h2>
            <div role="group" aria-label="Semana" class="flex gap-1 text-[11px] font-semibold">
                ${[[0, 'Esta'], [1, 'Anterior']].map(([b, l]) => `<button onclick="setSummaryWeek(${b})" aria-pressed="${summaryBack === b}" class="px-2.5 py-1 rounded-lg cursor-pointer ${summaryBack === b ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}">${l}</button>`).join('')}
            </div></div>
        <p class="text-[11px] text-slate-500 -mt-1">${range}</p>
        <div class="grid grid-cols-7 gap-1 items-end">${strip}</div>
        <div class="space-y-1"><div class="h-2 bg-slate-100 rounded-full overflow-hidden" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Plan cumplido"><div class="h-full bg-emerald-500 rounded-full" style="width:${pct}%"></div></div>
            <p class="text-[10px] text-slate-500">${s.due ? `${pct} % del plan cumplido hasta ahora` : 'Todavía no hay entrenos que contar'}</p></div>
        <div class="grid grid-cols-2 gap-2">${tiles}</div>
        ${extras.length ? `<p class="text-[11px] text-slate-600">${extras.join(' · ')}</p>` : ''}
        ${weekNotes(s).map(t => `<p class="text-[11px] text-slate-700 bg-slate-50 rounded-lg p-2">${t}</p>`).join('')}
        <p class="text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-xl p-3">${weekPhrase(s)}</p>`;
}

// ---------- Ajuste automático del plan ----------
const ADJUST_DAYS = 14; // cada cuánto se revisa el plan
const getAdjust = () => safeParse('dreamfit_adjust', {});
const LEVEL_NEXT = { beginner: 'mid', mid: 'adv' };

function adherence(days = 14) { // entrenos planificados hechos en los últimos `days` días (sin contar hoy)
    const agenda = getAgenda(), ov = getOverrides(), log = getLog(); let planned = 0, done = 0;
    for (let i = 1; i <= days; i++) {
        const k = shiftDays(-i), kind = kindOf(getPlanFor(k, agenda, ov));
        if (kind === 'strength' || kind === 'run' || kind === 'class') { planned++; if (log[k]) done++; }
    }
    return { planned, done, ratio: planned ? done / planned : null };
}
// Devuelve la sugerencia pendiente o null. { kind, title, why, apply, yes }
function planAdvice() {
    const p = getProfile(), n = p && myNutrition();
    if (!p || !n) return null;
    if (Date.now() - Math.max(p.ts || 0, getAdjust().ts || 0) < ADJUST_DAYS * 86400000) return null;
    const ad = adherence(14);
    if (ad.planned < 4) return null; // aún hay pocos datos
    const resumen = `${ad.done} de ${ad.planned} entrenos planificados en las últimas 2 semanas`;
    if (ad.ratio < 0.5) {
        if (p.days <= 2) return { kind: 'ok', title: 'Vamos con calma', why: `Has hecho ${resumen}. No pasa nada: empieza por uno o dos entrenos cortos y ve sumando.`, yes: 'Entendido' };
        return { kind: 'days', title: `Prueba con ${p.days - 1} días por semana`, why: `Has hecho ${resumen}. Un plan que se cumple vale más que uno ideal que no se hace. Se rehará tu semana de entrenos.`, apply: { days: p.days - 1 }, yes: 'Aplicar' };
    }
    const tr = weightTrend(21), wk = x => String(trim1(Math.abs(x))).replace('.', ',') + ' kg';
    const tryKcal = delta => { const k = Math.max(-300, Math.min(300, (p.kcalAdj || 0) + delta)); return k !== (p.kcalAdj || 0) && calcNutrition({ ...p, kcalAdj: k }).kcal !== n.kcal ? k : null; };
    if (tr && ad.ratio >= 0.7) {
        if (p.goal === 'fat' && tr.perWeek > -0.1) { const k = tryKcal(-100); if (k !== null) return { kind: 'kcal', title: 'Baja unas 100 kcal al día', why: `Cumples tu plan (${resumen}) pero tu peso no baja (${tr.perWeek > 0 ? '+' : ''}${String(trim1(tr.perWeek)).replace('.', ',')} kg por semana). Un pequeño ajuste suele bastar.`, apply: { kcalAdj: k }, yes: 'Aplicar' }; }
        if (p.goal === 'fat' && tr.perWeek < -Math.max(0.9, p.weight * 0.012)) { const k = tryKcal(150); if (k !== null) return { kind: 'kcal', title: 'Sube unas 150 kcal al día', why: `Estás perdiendo ${wk(tr.perWeek)} por semana: es rápido y puedes perder músculo. Algo más de comida protege tu energía y tu masa muscular.`, apply: { kcalAdj: k }, yes: 'Aplicar' }; }
        if (p.goal === 'muscle' && tr.perWeek < 0.05) { const k = tryKcal(150); if (k !== null) return { kind: 'kcal', title: 'Sube unas 150 kcal al día', why: `Cumples tu plan (${resumen}) pero tu peso no sube (${tr.perWeek > 0 ? '+' : ''}${String(trim1(tr.perWeek)).replace('.', ',')} kg por semana). Para ganar músculo hace falta algo de superávit.`, apply: { kcalAdj: k }, yes: 'Aplicar' }; }
        if (p.goal === 'muscle' && tr.perWeek > Math.max(0.45, p.weight * 0.007)) { const k = tryKcal(-100); if (k !== null) return { kind: 'kcal', title: 'Baja unas 100 kcal al día', why: `Subes ${wk(tr.perWeek)} por semana: demasiado rápido suele ser también grasa. Un ajuste pequeño afina el resultado.`, apply: { kcalAdj: k }, yes: 'Aplicar' }; }
    }
    if (ad.planned >= 6 && ad.ratio >= 0.9) {
        if (LEVEL_NEXT[p.level]) return { kind: 'level', title: `Sube a nivel ${LEVELS[LEVEL_NEXT[p.level]].label}`, why: `Has hecho ${resumen}. Estás lista/o para más series y más peso. Se rehará tu semana de entrenos.`, apply: { level: LEVEL_NEXT[p.level] }, yes: 'Aplicar' };
        if (p.days < 5) return { kind: 'days', title: `Prueba con ${p.days + 1} días por semana`, why: `Has hecho ${resumen} y ya estás en nivel avanzado. Un día más de entreno es el siguiente paso. Se rehará tu semana.`, apply: { days: p.days + 1 }, yes: 'Aplicar' };
    }
    if (!tr && p.goal !== 'tone' && p.goal !== 'health') return { kind: 'weigh', title: 'Pésate para ajustar tus calorías', why: 'Con dos pesos separados por al menos una semana puedo ver tu tendencia y proponerte cambios. Regístralos en Progreso → Peso.' };
    return { kind: 'ok', title: 'Tu plan va bien', why: `${resumen[0].toUpperCase() + resumen.slice(1)}${tr ? ` y tu peso evoluciona ${tr.perWeek > 0.05 ? '+' : tr.perWeek < -0.05 ? '−' : ''}${tr.perWeek > 0.05 || tr.perWeek < -0.05 ? wk(tr.perWeek) + ' por semana' : 'estable'}` : ''}. No toca cambiar nada: sigue así.`, yes: 'Entendido' };
}
function renderAdviceCard() {
    const el = document.getElementById('advice-card'); if (!el) return;
    const a = planAdvice();
    el.classList.toggle('hidden', !a);
    if (!a) { el.innerHTML = ''; return; }
    const icon = { kcal: 'fa-utensils', level: 'fa-arrow-trend-up', days: 'fa-calendar-days', weigh: 'fa-weight-scale', ok: 'fa-circle-check' }[a.kind];
    el.innerHTML = `<p class="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Revisión de tu plan</p>
        <h3 class="font-bold text-sm text-slate-900 flex items-center gap-2"><i class="fa-solid ${icon} text-emerald-600" aria-hidden="true"></i> ${a.title}</h3>
        <p class="text-xs text-slate-600">${a.why}</p>
        ${a.kind === 'weigh' ? `<button onclick="switchTab('progreso')" class="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-emerald-700">Ir a Peso</button>`
        : `<div class="flex gap-2"><button onclick="resolveAdvice(true)" class="flex-1 bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-emerald-700">${a.yes}</button>${a.apply ? `<button onclick="resolveAdvice(false)" class="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-slate-200">Ahora no</button>` : ''}</div>`}`;
}
async function resolveAdvice(accept) {
    const a = planAdvice(), p = getProfile();
    if (!a || !p) { renderAdviceCard(); return; }
    if (accept && a.apply) {
        if (a.apply.kcalAdj !== undefined) {
            DB.setItem('dreamfit_profile', JSON.stringify({ ...p, kcalAdj: a.apply.kcalAdj }));
        } else {
            const yes = await UI.confirm({ title: a.title + '?', message: 'Se rehará tu semana de entrenos con el nuevo plan. Lo que hayas personalizado en la semana se sustituirá.', confirmText: 'Aplicar', icon: 'fa-wand-magic-sparkles' });
            if (!yes) return;
            applyProfile({ ...p, ...a.apply });
        }
        showToast('Plan actualizado ✅');
    }
    DB.setItem('dreamfit_adjust', JSON.stringify({ ts: Date.now(), kind: a.kind, accepted: !!(accept && a.apply) }));
    renderGoalCard(); renderNutriCard(); renderMenuCard(); renderWaterCard(); renderTodayLive(); renderAdviceCard();
}
