// ===== SEMANA: menú de 7 días + lista de la compra semanal + preparación del domingo (batch cooking) =====
// Usa los mismos platos, tus objetivos y tus preferencias de alimentación que el menú del día.
const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const getWeek = () => { const w = safeParse('dreamfit_week', null); return w && Array.isArray(w.days) && w.days.length === 7 ? w : null; };
const saveWeek = w => DB.setItem('dreamfit_week', JSON.stringify(w));
const weekFood = (id, T, meal) => { const d = getDish(id), k = dishScale(d, T.meals[meal]); return { d, k, m: dishMacros(d, k) }; };

function planWeek() {
    const T = menuTargets(); if (!T) return null;
    const usage = {}, days = [];
    for (let di = 0; di < 7; di++) {
        const day = {}, prots = [];
        for (const meal of MENU_MEALS) {
            let r = rankedDishes(meal, T, []);
            if (!r.length) return null;
            if (meal === 'dinner') { const nr = r.filter(x => !x.d.i.some(([k]) => PROT_KEYS.includes(k) && prots.includes(k))); if (nr.length) r = nr; } // proteína distinta en comida y cena
            const cu = getDiet().cuisines, eff = x => (usage[x.d.id] || 0) - (cu.includes(x.d.q || 'esp') ? 1 : 0); // menos repetidos primero; tu cocina favorita puede repetir una vez más
            const min = Math.min(...r.map(eff));
            const pool = r.filter(x => eff(x) === min).sort((a, b) => a.cost - b.cost).slice(0, 4);
            const pick = pool[Math.floor(Math.random() * pool.length)].d;
            day[meal] = pick.id; usage[pick.id] = (usage[pick.id] || 0) + 1;
            pick.i.forEach(([k]) => { if (PROT_KEYS.includes(k)) prots.push(k); });
        }
        days.push(day);
    }
    return { days, ts: Date.now() };
}
function buildWeek() {
    const w = planWeek();
    if (!w) { weekState.msg = 'Con tus preferencias no tengo platos suficientes para montar la semana. Prueba a quitar alguna restricción.'; renderMealWeek(); return; }
    weekState.msg = ''; saveWeek(w); renderMealWeek(); showToast('Semana planificada');
}
const weekState = { msg: '' };
function weekOnDietChange() { if (getWeek()) { const w = planWeek(); if (w) saveWeek(w); } }
function swapWeekDish(di, meal) { // «otro plato» para una comida concreta de la semana
    const T = menuTargets(), w = getWeek(); if (!T || !w) return;
    const cur = w.days[di][meal], inWeek = w.days.map(d => d[meal]);
    let r = rankedDishes(meal, T, inWeek.filter(x => x !== cur)).map(x => x.d.id);
    if (!r.length) return;
    w.days[di][meal] = r[(Math.max(0, r.indexOf(cur)) + 1) % r.length]; saveWeek(w); renderMealWeek(di);
}
function weekNeeds(w) { // alimentos y gramos de toda la semana, con las raciones ajustadas
    const T = menuTargets(), need = {}; if (!T || !w) return need;
    w.days.forEach(day => MENU_MEALS.forEach(meal => { const { d, k } = weekFood(day[meal], T, meal); d.i.forEach(([key, g]) => { need[key] = (need[key] || 0) + g * k; }); }));
    return need;
}
function weekToShopping() { const n = weekNeeds(getWeek()); if (Object.keys(n).length) menuToShopping(n); }

// ---------- preparación del domingo ----------
const BATCH_GROUPS = [
    { icon: '🍚', title: 'Cereales y pasta: cuécelos de una vez', keys: ['arroz', 'pasta', 'quinoa', 'cuscus', 'fideos'], tip: 'Enfría rápido, guarda en táper hasta 4 días en nevera. Lo de los últimos días, congélalo en raciones.' },
    { icon: '🍗', title: 'Carnes: plancha u horno', keys: ['pollo', 'pavo', 'ternera', 'cerdo'], tip: 'Corta en raciones. Los primeros 3 días en nevera; el resto, al congelador y pásalo a la nevera la noche antes.' },
    { icon: '🐟', title: 'Pescado y marisco', keys: ['salmon', 'merluza', 'bacalao', 'gambas', 'sardina', 'atun'], tip: 'Mejor fresco: cómpralo para los 2 primeros días y congela el resto en raciones. Las latas no necesitan preparación.' },
    { icon: '🫘', title: 'Legumbres y proteína vegetal', keys: ['legumbre', 'garbanzo', 'frijoles', 'tofu'], tip: 'Los botes solo hay que escurrirlos y enjuagarlos. El tofu, sécalo y dóralo en dados: aguanta 4 días.' },
    { icon: '🥚', title: 'Huevos duros', keys: ['huevo'], tip: 'Cocidos y con cáscara duran 5 días en nevera.', egg: true },
    { icon: '🥦', title: 'Verduras: lava, trocea y guarda', keys: ['calabacin', 'pimiento', 'zanahoria', 'cebolla', 'champi', 'espinacas', 'ensalada', 'berenjena', 'coliflor', 'judias', 'pepino', 'tomate'], tip: 'Guárdalas en táper con papel de cocina para que duren 4-5 días. Aliña las ensaladas justo al comer.' },
    { icon: '🍠', title: 'Horno: patata y boniato', keys: ['patata', 'boniato'], tip: 'Hornea o cuece a la vez que lo demás; se recalientan bien.' }
];
function batchPlan(need) {
    const out = [];
    for (const g of BATCH_GROUPS) {
        const items = g.keys.filter(k => need[k] > 0 && FOODS[k]);
        if (!items.length) continue;
        const line = g.egg ? `unos ${Math.max(2, Math.round(need.huevo / 60))} huevos` : items.map(k => `${FOODS[k].n.toLowerCase()} ${amountText(k, need[k])}`).join(' · ');
        out.push({ icon: g.icon, title: g.title, line, tip: g.tip });
    }
    return out;
}
function weekBatchHtml(need) {
    const steps = batchPlan(need);
    if (!steps.length) return '';
    return `<div class="space-y-2"><h3 class="font-bold text-sm text-slate-900">🧑‍🍳 Preparación del domingo (≈ 90 min)</h3>
        <p class="text-[11px] text-slate-500">Orden sugerido: pon primero lo que tarda más (horno y cereales) y mientras tanto corta y plancha.</p>
        ${steps.map(s => `<div class="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-0.5"><p class="text-xs font-bold text-slate-800">${s.icon} ${s.title}</p><p class="text-[11px] text-emerald-800">${escapeHtml(s.line)}</p><p class="text-[11px] text-slate-500">${s.tip}</p></div>`).join('')}
        <p class="text-[11px] text-slate-500">Durante la semana solo montas cada plato: calentar, mezclar y listo en 5-10 minutos. Las cantidades son las crudas de la lista de la compra.</p></div>`;
}

function renderMealWeek(openDay) {
    const el = document.getElementById('week-card'); if (!el) return;
    const head = `<h2 class="font-bold text-base text-slate-900 flex items-center gap-2"><i class="fa-solid fa-calendar-week text-emerald-600" aria-hidden="true"></i> Tu semana, planificada</h2>`;
    const T = menuTargets();
    if (!T) { el.innerHTML = head + `<p class="text-xs text-slate-500">Para planificar la semana con tus calorías y macros necesito tus datos (sexo, edad, altura, peso y actividad).</p><button onclick="openOnboarding(false)" class="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-emerald-700">Calcular mis calorías</button>`; return; }
    const w = getWeek(), err = weekState.msg ? `<p role="alert" class="text-xs text-red-600">${escapeHtml(weekState.msg)}</p>` : '';
    if (!w) {
        el.innerHTML = head + `<p class="text-xs text-slate-500">Te monto los 7 días (4 comidas al día) con tus objetivos y preferencias, la <b>lista de la compra de toda la semana</b> y una <b>guía de preparación para el domingo</b> (batch cooking): cocinas una vez y comes toda la semana.</p>${err}
            <button onclick="buildWeek()" class="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-emerald-700"><i class="fa-solid fa-wand-magic-sparkles mr-1" aria-hidden="true"></i> Planificar mi semana</button>
            <p class="text-[10px] text-slate-400">Usa el menú básico (sin límite de uso). Tus preferencias de alimentación se cambian en la pestaña «Menú».</p>`;
        return;
    }
    const today = (new Date().getDay() + 6) % 7, open = Number.isInteger(openDay) ? openDay : today;
    const days = w.days.map((day, di) => {
        let kcal = 0;
        const rows = MENU_MEALS.map(meal => {
            const { d, m } = weekFood(day[meal], T, meal); kcal += m.kcal;
            return `<div class="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0"><div class="min-w-0 flex-1"><p class="text-[10px] font-bold uppercase text-slate-400">${MENU_LABEL[meal]} · ${Math.round(m.kcal)} kcal · ${Math.round(m.p)} g prot.</p><p class="text-xs font-semibold text-slate-800">${escapeHtml(d.n)}</p></div><button onclick="swapWeekDish(${di}, '${meal}')" aria-label="Cambiar ${escapeHtml(d.n)}" class="w-8 h-8 shrink-0 rounded-lg text-slate-500 bg-slate-100 cursor-pointer"><i class="fa-solid fa-rotate-right" aria-hidden="true"></i></button></div>`;
        }).join('');
        return `<details ${di === open ? 'open' : ''} class="bg-slate-50 border border-slate-100 rounded-xl"><summary class="p-3 text-xs font-bold text-slate-800 cursor-pointer flex justify-between gap-2"><span>${WEEK_DAYS[di]}${di === today ? ' · hoy' : ''}</span><span class="font-normal text-slate-500">${Math.round(kcal)} kcal</span></summary><div class="px-3 pb-2">${rows}</div></details>`;
    }).join('');
    const need = weekNeeds(w);
    el.innerHTML = head + `${err}<div class="space-y-2">${days}</div>
        <div class="flex gap-2"><button onclick="weekToShopping()" class="flex-1 text-xs bg-emerald-600 text-white font-bold py-2.5 rounded-xl cursor-pointer"><i class="fa-solid fa-cart-shopping mr-1" aria-hidden="true"></i>Lista de la compra semanal</button><button onclick="buildWeek()" class="flex-1 text-xs bg-slate-100 text-slate-700 font-semibold py-2.5 rounded-xl cursor-pointer">Otra semana</button></div>
        ${weekBatchHtml(need)}
        <p class="text-[10px] text-slate-400">Valores medios orientativos. Revisa alergias e intolerancias. No sustituye el consejo de un profesional sanitario.</p>`;
}
