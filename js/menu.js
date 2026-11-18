// ===== MENÚ A TU MEDIDA + LISTA DE LA COMPRA =====
// Monta las 4 comidas del día para que cuadren con TUS objetivos (calorías, proteína, hidratos y grasas, calculados con tu metabolismo basal)
// y crea la lista de la compra con lo que te falte. Todo sale de una tabla de alimentos (valores medios por 100 g) y de platos con cantidades:
// son estimaciones orientativas, no un plan médico.

// k = clave del alimento en el generador por ingredientes (ING) para descontar lo que ya tienes · u = unidad de compra (g por unidad)
const FOODS = {
    pollo:      { n: 'Pechuga de pollo', c: 'carne', k: 'pollo', e: [120, 23, 0, 2.5] },
    pavo:       { n: 'Pavo (fiambre o filetes)', c: 'carne', k: 'pavo', e: [110, 22, 1, 2] },
    ternera:    { n: 'Ternera magra', c: 'carne', k: 'carne', e: [150, 21, 0, 7] },
    jamon:      { n: 'Jamón cocido', c: 'carne', k: 'jamon', e: [110, 18, 1, 4] },
    atun:       { n: 'Atún al natural (lata)', c: 'carne', k: 'atun', e: [110, 25, 0, 1] },
    salmon:     { n: 'Salmón', c: 'carne', k: 'pescado', e: [200, 20, 0, 13] },
    merluza:    { n: 'Merluza', c: 'carne', k: 'pescado', e: [80, 17, 0, 1] },
    huevo:      { n: 'Huevos', c: 'lacteos', k: 'huevo', e: [145, 12.5, 1, 10], u: [60, 'huevo', 'huevos'] },
    yogur:      { n: 'Yogur griego natural', c: 'lacteos', k: 'yogur', e: [100, 9, 4, 5], u: [125, 'yogur', 'yogures'] },
    skyr:       { n: 'Skyr / yogur proteico', c: 'lacteos', k: 'yogur', e: [60, 11, 4, 0.2], u: [150, 'tarrina', 'tarrinas'] },
    quesofresco:{ n: 'Queso fresco batido 0%', c: 'lacteos', k: 'queso', e: [50, 8, 4, 0.2] },
    queso:      { n: 'Queso curado rallado', c: 'lacteos', k: 'queso', e: [380, 25, 1, 30] },
    leche:      { n: 'Leche semidesnatada', c: 'lacteos', k: 'leche', e: [47, 3.4, 4.8, 1.6] },
    arroz:      { n: 'Arroz', c: 'despensa', k: 'arroz', e: [360, 7, 79, 0.6] },
    pasta:      { n: 'Pasta', c: 'despensa', k: 'macarron', e: [355, 12, 72, 1.5] },
    avena:      { n: 'Copos de avena', c: 'despensa', k: 'avena', e: [370, 13, 60, 7] },
    pan:        { n: 'Pan integral', c: 'despensa', k: 'pan', e: [250, 9, 45, 3.5], u: [30, 'rebanada', 'rebanadas'] },
    wrap:       { n: 'Wraps de trigo', c: 'despensa', k: 'wrap', e: [300, 8, 50, 7], u: [60, 'wrap', 'wraps'] },
    legumbre:   { n: 'Legumbres cocidas (bote)', c: 'despensa', k: 'legumbre', e: [120, 8, 18, 1.5] },
    aceite:     { n: 'Aceite de oliva', c: 'despensa', k: null, e: [884, 0, 0, 100] },
    cacahuete:  { n: 'Crema de cacahuete', c: 'despensa', k: 'frutos_secos', e: [600, 25, 15, 50] },
    miel:       { n: 'Miel', c: 'despensa', k: 'miel', e: [300, 0.3, 80, 0] },
    frutossecos:{ n: 'Frutos secos naturales', c: 'despensa', k: 'frutos_secos', e: [610, 20, 10, 53] },
    patata:     { n: 'Patata', c: 'fruta_verdura', k: 'patata', e: [77, 2, 17, 0.1] },
    boniato:    { n: 'Boniato', c: 'fruta_verdura', k: 'patata', e: [86, 1.6, 20, 0.1] },
    tomate:     { n: 'Tomate', c: 'fruta_verdura', k: 'tomate', e: [18, 0.9, 3.9, 0.2] },
    ensalada:   { n: 'Ensalada / lechuga', c: 'fruta_verdura', k: 'verdura', e: [20, 1.5, 3, 0.3] },
    espinacas:  { n: 'Espinacas', c: 'fruta_verdura', k: 'verdura', e: [23, 2.9, 3.6, 0.4] },
    calabacin:  { n: 'Calabacín / brócoli', c: 'fruta_verdura', k: 'calabacin', e: [28, 2.5, 4.5, 0.4] },
    champi:     { n: 'Champiñones', c: 'fruta_verdura', k: 'champi', e: [22, 3, 3, 0.3] },
    cebolla:    { n: 'Cebolla', c: 'fruta_verdura', k: 'cebolla', e: [40, 1, 9, 0.1] },
    pimiento:   { n: 'Pimiento', c: 'fruta_verdura', k: 'pimiento', e: [27, 1, 6, 0.2] },
    zanahoria:  { n: 'Zanahoria', c: 'fruta_verdura', k: 'zanahoria', e: [41, 0.9, 10, 0.2] },
    aguacate:   { n: 'Aguacate', c: 'fruta_verdura', k: 'aguacate', e: [160, 2, 9, 15] },
    platano:    { n: 'Plátano', c: 'fruta_verdura', k: 'platano', e: [90, 1, 23, 0.3], u: [120, 'plátano', 'plátanos'] },
    manzana:    { n: 'Manzana', c: 'fruta_verdura', k: 'manzana', e: [52, 0.3, 14, 0.2], u: [180, 'manzana', 'manzanas'] },
    frutosrojos:{ n: 'Fruta (fresas, frutos rojos…)', c: 'fruta_verdura', k: 'fruta', e: [40, 0.8, 8, 0.3] }
};
const SHOP_CATS = { carne: ['🥩', 'Carne y pescado'], lacteos: ['🥛', 'Huevos y lácteos'], fruta_verdura: ['🥦', 'Fruta y verdura'], despensa: ['🥫', 'Despensa'], otros: ['🛒', 'Otros'] };

// Platos: i = [alimento, gramos por ración base]. Se escalan para clavar las calorías de esa comida.
const DISHES = [
    // media mañana
    { id: 'm1', m: 'morn', n: 'Yogur griego con avena y fruta', i: [['yogur', 200], ['avena', 30], ['frutosrojos', 100], ['miel', 6]], s: ['Mezcla el yogur con la avena.', 'Añade la fruta y un hilo de miel.'] },
    { id: 'm2', m: 'morn', n: 'Tostada de pavo y tomate', i: [['pan', 60], ['pavo', 50], ['tomate', 60], ['aceite', 5]], s: ['Tuesta el pan, ralla el tomate encima con un hilo de aceite.', 'Termina con el pavo.'] },
    { id: 'm3', m: 'morn', n: 'Skyr con plátano y frutos secos', i: [['skyr', 150], ['platano', 120], ['frutossecos', 15]], s: ['Pon el skyr en un bol, corta el plátano y añade los frutos secos.'] },
    { id: 'm4', m: 'morn', n: 'Mini tortilla con queso fresco', i: [['huevo', 120], ['quesofresco', 40], ['aceite', 3]], s: ['Bate los huevos, añade el queso fresco desmenuzado.', 'Cuaja en sartén antiadherente.'] },
    { id: 'm5', m: 'morn', n: 'Manzana con crema de cacahuete y yogur', i: [['manzana', 180], ['cacahuete', 15], ['yogur', 125]], s: ['Corta la manzana en gajos y sírvela con la crema de cacahuete y el yogur.'] },
    { id: 'm6', m: 'morn', n: 'Bocadillo pequeño de atún', i: [['pan', 60], ['atun', 50], ['tomate', 50], ['aceite', 4]], s: ['Abre el pan, reparte tomate y atún escurrido.'] },
    // comida
    { id: 'l1', m: 'lunch', n: 'Arroz con pollo y verduras', i: [['arroz', 90], ['pollo', 150], ['pimiento', 80], ['cebolla', 40], ['tomate', 80], ['aceite', 10]], s: ['Dora el pollo en dados con las verduras picadas.', 'Añade el arroz y cúbrelo con agua; cuece unos 18 min.'] },
    { id: 'l2', m: 'lunch', n: 'Pasta con atún y tomate', i: [['pasta', 90], ['atun', 100], ['tomate', 150], ['aceite', 10], ['queso', 12]], s: ['Cuece la pasta al dente.', 'Sofríe el tomate, añade el atún y mezcla con la pasta.', 'Termina con el queso rallado.'] },
    { id: 'l3', m: 'lunch', n: 'Lentejas estofadas con verduras y huevo', i: [['legumbre', 300], ['zanahoria', 80], ['cebolla', 40], ['huevo', 60], ['aceite', 8]], s: ['Pocha cebolla y zanahoria, añade las lentejas escurridas y un vaso de agua.', 'Cuece 10 min y sirve con el huevo cocido.'] },
    { id: 'l4', m: 'lunch', n: 'Salmón al horno con patata y brócoli', i: [['salmon', 150], ['patata', 250], ['calabacin', 150], ['aceite', 10]], s: ['Hornea patata en rodajas 15 min a 200 ºC.', 'Añade el salmón y el brócoli y hornea 12 min más.'] },
    { id: 'l5', m: 'lunch', n: 'Wraps de pollo y aguacate con ensalada', i: [['wrap', 120], ['pollo', 140], ['aguacate', 60], ['ensalada', 100], ['tomate', 60]], s: ['Plancha el pollo en tiras.', 'Rellena los wraps con pollo, aguacate, ensalada y tomate.'] },
    { id: 'l6', m: 'lunch', n: 'Ternera salteada con arroz y champiñones', i: [['ternera', 150], ['arroz', 80], ['champi', 120], ['cebolla', 40], ['aceite', 10]], s: ['Cuece el arroz.', 'Saltea la ternera con cebolla y champiñones a fuego fuerte y mezcla.'] },
    { id: 'l7', m: 'lunch', n: 'Merluza con boniato y ensalada', i: [['merluza', 200], ['boniato', 250], ['ensalada', 100], ['aceite', 12]], s: ['Hornea el boniato en dados 25 min a 200 ºC.', 'Haz la merluza a la plancha y sirve con la ensalada.'] },
    // merienda
    { id: 's1', m: 'snack', n: 'Yogur con fruta y frutos secos', i: [['yogur', 125], ['frutosrojos', 100], ['frutossecos', 15]], s: ['Mezcla todo en un bol.'] },
    { id: 's2', m: 'snack', n: 'Tostada de queso fresco y fruta', i: [['pan', 60], ['quesofresco', 100], ['frutosrojos', 80], ['miel', 8]], s: ['Unta el queso sobre el pan tostado y cubre con la fruta y la miel.'] },
    { id: 's3', m: 'snack', n: 'Batido de leche, plátano y avena', i: [['leche', 250], ['platano', 120], ['avena', 30]], s: ['Bate todo hasta que quede cremoso.'] },
    { id: 's4', m: 'snack', n: 'Tortitas de avena y plátano', i: [['avena', 50], ['huevo', 60], ['platano', 100]], s: ['Tritura todo.', 'Cocina cucharadas en sartén antiadherente 2 min por lado.'] },
    { id: 's5', m: 'snack', n: 'Skyr con avena y manzana', i: [['skyr', 150], ['avena', 25], ['manzana', 120]], s: ['Mezcla el skyr con la avena y añade la manzana en dados.'] },
    { id: 's6', m: 'snack', n: 'Sándwich de pavo y queso fresco', i: [['pan', 60], ['pavo', 50], ['quesofresco', 40], ['tomate', 50]], s: ['Monta el sándwich y tuéstalo si quieres.'] },
    // cena
    { id: 'd1', m: 'dinner', n: 'Tortilla de patata ligera con ensalada', i: [['huevo', 180], ['patata', 150], ['cebolla', 50], ['aceite', 10], ['ensalada', 100]], s: ['Pocha patata y cebolla en poco aceite.', 'Mezcla con el huevo batido y cuaja la tortilla.'] },
    { id: 'd2', m: 'dinner', n: 'Pollo a la plancha con boniato y ensalada', i: [['pollo', 170], ['boniato', 150], ['ensalada', 120], ['tomate', 80], ['aceite', 10]], s: ['Hornea o cuece el boniato.', 'Plancha el pollo y sirve con la ensalada.'] },
    { id: 'd3', m: 'dinner', n: 'Revuelto de espinacas, champiñones y jamón', i: [['huevo', 180], ['espinacas', 100], ['champi', 100], ['jamon', 40], ['pan', 50], ['aceite', 8]], s: ['Saltea champiñones y espinacas.', 'Añade el jamón y los huevos batidos y remueve hasta cuajar.', 'Sirve con el pan.'] },
    { id: 'd4', m: 'dinner', n: 'Crema de calabacín con atún y tostada', i: [['calabacin', 300], ['patata', 100], ['atun', 80], ['pan', 40], ['aceite', 8]], s: ['Cuece calabacín y patata y tritúralos.', 'Sirve con el atún por encima y la tostada.'] },
    { id: 'd5', m: 'dinner', n: 'Pavo salteado con verduras y arroz', i: [['pavo', 160], ['arroz', 60], ['pimiento', 100], ['zanahoria', 60], ['aceite', 10]], s: ['Cuece el arroz.', 'Saltea el pavo en tiras con las verduras y mezcla.'] },
    { id: 'd6', m: 'dinner', n: 'Ensalada completa de legumbres y atún', i: [['legumbre', 200], ['atun', 80], ['tomate', 120], ['ensalada', 80], ['cebolla', 20], ['huevo', 60], ['aceite', 12]], s: ['Mezcla todo y aliña con el aceite.'] },
    { id: 'd7', m: 'dinner', n: 'Merluza con verduras salteadas y patata', i: [['merluza', 200], ['calabacin', 150], ['patata', 150], ['champi', 80], ['aceite', 12]], s: ['Cuece la patata.', 'Saltea las verduras y haz la merluza a la plancha.'] }
];
const MENU_MEALS = ['morn', 'lunch', 'snack', 'dinner'];
const MENU_LABEL = { morn: 'Media mañana', lunch: 'Comida', snack: 'Merienda', dinner: 'Cena' };

function dishMacros(d, k = 1) { // calorías y macros de un plato con las cantidades × k
    const t = { kcal: 0, p: 0, c: 0, f: 0 };
    d.i.forEach(([key, g]) => { const e = FOODS[key].e, q = g * k / 100; t.kcal += e[0] * q; t.p += e[1] * q; t.c += e[2] * q; t.f += e[3] * q; });
    return t;
}
// factor para llegar a las kcal de la comida, sin pasarse de raciones raras
function dishScale(d, target) { return Math.max(0.6, Math.min(1.8, target.kcal / dishMacros(d).kcal)); }
function dishCost(d, target) { // cuanto menor, mejor encaja con la comida (calorías por la escala, y proteína, hidratos y grasas)
    const k = dishScale(d, target), m = dishMacros(d, k);
    const err = (a, b) => Math.abs(a - b) / Math.max(b, 10);
    return err(m.kcal, target.kcal) * 2 + err(m.p, target.protein) * 1.5 + err(m.c, target.carbs) * 0.6 + err(m.f, target.fat) * 0.6;
}
const menuState = { picks: null, seed: 0, ai: null, busy: false, remaining: null }; // ai: { meal: receta de la IA } cuando el menú viene de la IA
function menuTargets() { const n = myNutrition(); return n ? { n, meals: n.meals } : null; }

function rankedDishes(meal, T, exceptIds) {
    return DISHES.filter(d => d.m === meal && !exceptIds.includes(d.id)).map(d => ({ d, cost: dishCost(d, T.meals[meal]) })).sort((a, b) => a.cost - b.cost);
}
function planMenu(shuffle) {
    const T = menuTargets(); if (!T) return null;
    const used = [], picks = {}, proteins = [];
    MENU_MEALS.forEach(meal => {
        let r = rankedDishes(meal, T, used);
        if (meal === 'dinner') { const nr = r.filter(x => !x.d.i.some(([k]) => ['pollo', 'ternera', 'salmon', 'merluza', 'pavo'].includes(k) && proteins.includes(k))); if (nr.length) r = nr; } // no repetir la misma proteína en comida y cena
        const pool = r.slice(0, shuffle ? 4 : 1), pick = pool[Math.floor(Math.random() * pool.length)].d;
        picks[meal] = pick.id; used.push(pick.id);
        pick.i.forEach(([k]) => { if (['pollo', 'ternera', 'salmon', 'merluza', 'pavo'].includes(k)) proteins.push(k); });
    });
    return picks;
}
function swapDish(meal) { // «otro plato»: con IA pide otro a la IA; si no, pasa al siguiente que mejor encaje y no esté ya en el menú
    const T = menuTargets(); if (!T || !menuState.picks) return;
    if (menuState.ai) return buildAiMenu(meal);
    const inMenu = Object.values(menuState.picks), cur = menuState.picks[meal];
    const r = rankedDishes(meal, T, inMenu.filter(x => x !== cur)).map(x => x.d.id), at = r.indexOf(cur);
    menuState.picks[meal] = r[(at + 1) % r.length]; renderMenuCard();
}
function buildMenu(shuffle) { if (!menuTargets()) return; menuState.ai = null; menuState.msg = ''; menuState.picks = planMenu(shuffle); renderMenuCard(); }
function getDish(id) { return DISHES.find(d => d.id === id); }
const r5 = n => Math.round(n / 5) * 5;

function amountText(key, g) { // «2 huevos» o «180 g»
    const f = FOODS[key];
    if (f.u) { const n = Math.max(1, Math.round(g / f.u[0] * 2) / 2); return `${String(n).replace('.', ',')} ${n === 1 ? f.u[1] : f.u[2]}`; }
    return `${g >= 100 ? Math.round(g / 10) * 10 : r5(g)} g`;
}
const menuPct = (v, t) => Math.round(v / Math.max(t, 1) * 100);


// ---------- Menú con IA ----------
function aiMenuPayload(only, avoid) {
    const n = myNutrition(), p = getProfile(); if (!n) return null;
    const meals = {}; MENU_MEALS.forEach(k => { meals[k] = { kcal: n.meals[k].kcal, protein_g: n.meals[k].protein, carbs_g: n.meals[k].carbs, fat_g: n.meals[k].fat }; });
    return {
        ingredients: (document.getElementById('user-ingredients') || { value: '' }).value.trim(),
        restrictions: (document.getElementById('user-restrictions') || { value: '' }).value.trim(),
        day: { kcal: n.kcal, protein_g: n.protein, carbs_g: n.carbs, fat_g: n.fat, objective: p.goal },
        meals, only: only || undefined, avoid
    };
}
async function buildAiMenu(only) { // only = una sola comida («Otro plato») o vacío = todo el día
    if (menuState.busy || !menuTargets()) return;
    const avoid = Object.values(menuState.ai || {}).map(r => r.title).filter(Boolean);
    menuState.busy = true; menuState.msg = ''; renderMenuCard();
    try {
        const d = await AiRecipes.generateMenu(aiMenuPayload(only, avoid));
        const next = only ? { ...(menuState.ai || {}) } : {};
        d.menu.forEach(r => { next[r.meal] = r; });
        if (MENU_MEALS.some(k => !next[k])) throw { code: 'empty', message: 'La IA no ha devuelto el menú completo. Inténtalo de nuevo.' };
        menuState.ai = next; menuState.picks = menuState.picks || {}; menuState.remaining = d.remaining; menuState.limit = d.limit;
    } catch (e) { menuState.msg = AiRecipes.message(e); }
    menuState.busy = false; renderMenuCard();
}
// Una comida lista para pintar, venga de la IA o del menú básico
function menuView(meal, T) {
    const tg = T.meals[meal];
    if (menuState.ai && menuState.ai[meal]) {
        const r = menuState.ai[meal];
        return { title: r.title, tg, m: { kcal: r.calories, p: r.protein_g, c: r.carbs_g, f: r.fat_g }, ingr: r.ingredients.map(x => escapeHtml(x.name + (x.amount ? ' (' + x.amount + ')' : ''))).join(', '), steps: r.steps, ai: true, time: r.time_min };
    }
    const d = getDish(menuState.picks[meal]), k = dishScale(d, tg), m = dishMacros(d, k);
    return { title: d.n, tg, m, ingr: d.i.map(([key, g]) => `${escapeHtml(FOODS[key].n)} (${amountText(key, g * k)})`).join(', '), steps: d.s, ai: false };
}

function renderMenuCard() {
    const el = document.getElementById('menu-card'); if (!el) return;
    const head = `<h2 class="font-bold text-base text-slate-900 flex items-center gap-2"><i class="fa-solid fa-utensils text-emerald-600" aria-hidden="true"></i> Tu menú del día a medida</h2>`;
    const T = menuTargets();
    if (!T) { el.innerHTML = head + `<p class="text-xs text-slate-500">Para montarte un menú que cuadre con tus calorías y macros necesito tus datos (sexo, edad, altura, peso y actividad).</p><button onclick="openOnboarding(false)" class="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-emerald-700">Calcular mis calorías</button>`; return; }
    const n = T.n, aiOn = AiRecipes.enabled();
    const err = menuState.msg ? `<p role="alert" class="text-xs text-red-600">${escapeHtml(menuState.msg)}</p>` : '';
    if (menuState.busy) { el.innerHTML = head + `<p class="text-xs text-slate-500" role="status"><i class="fa-solid fa-spinner fa-spin mr-1" aria-hidden="true"></i> La IA está montando tu menú… puede tardar hasta un minuto.</p>`; return; }
    if (!menuState.picks) {
        el.innerHTML = head + `<p class="text-xs text-slate-500">Armo las 4 comidas del día para que cuadren con tu objetivo (<b>${fmtN(n.kcal)} kcal · ${n.protein} g de proteína · ${n.carbs} g de hidratos · ${n.fat} g de grasas</b>) y te preparo la lista de la compra con lo que te falte.</p>${err}
            <button onclick="setRecSection('ideas')" class="w-full text-[11px] text-emerald-700 font-semibold underline cursor-pointer">¿Qué tienes en casa o qué no puedes comer? Indícalo en «Ideas»</button>
            ${aiOn ? `<button onclick="buildAiMenu()" class="w-full bg-amber-300 hover:bg-amber-200 text-slate-950 font-bold py-2.5 rounded-xl text-xs cursor-pointer flex items-center justify-center gap-2"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Armar mi menú con IA</button>` : ''}
            <button onclick="buildMenu(false)" class="w-full ${aiOn ? 'bg-slate-100 text-slate-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'} font-bold py-2.5 rounded-xl text-xs cursor-pointer flex items-center justify-center gap-2">${aiOn ? 'Menú básico (sin IA)' : '<i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Armar mi menú'}</button>
            ${aiOn ? '<p class="text-[10px] text-slate-400">La IA da más variedad, usa tus ingredientes y restricciones (campos de más abajo) y cuenta como 1 uso del límite diario. El básico no tiene límite.</p>' : '<p class="text-[10px] text-slate-400">Con una cuenta, aquí aparecerá también el menú con IA, con más variedad.</p>'}`;
        return;
    }
    const tot = { kcal: 0, p: 0, c: 0, f: 0 }, isAi = !!menuState.ai;
    const blocks = MENU_MEALS.map(meal => {
        const v = menuView(meal, T), m = v.m;
        tot.kcal += m.kcal; tot.p += m.p; tot.c += m.c; tot.f += m.f;
        const chip = (x, l, cls) => `<span class="${cls} px-2 py-0.5 rounded-md">${x} ${l}</span>`;
        return `<div class="bg-slate-50 rounded-2xl p-3 space-y-2 border border-slate-100">
            <div><p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">${MENU_LABEL[meal]} · objetivo ≈ ${v.tg.kcal} kcal${v.ai ? ' · <span class="text-amber-600">IA</span>' : ''}</p><h4 class="font-bold text-sm text-slate-900">${escapeHtml(v.title)}</h4></div>
            <div class="flex flex-wrap gap-1.5 text-[10px] font-bold">${v.time ? chip('⏱ ' + v.time, 'min', 'text-slate-600 bg-slate-100') : ''}${chip(Math.round(m.kcal), 'kcal', 'text-emerald-700 bg-emerald-50')}${chip(Math.round(m.p) + ' g', 'prot.', 'text-emerald-700 bg-emerald-50')}${chip(Math.round(m.c) + ' g', 'hidr.', 'text-slate-600 bg-slate-100')}${chip(Math.round(m.f) + ' g', 'grasas', 'text-slate-600 bg-slate-100')}</div>
            <details class="text-xs text-slate-600"><summary class="cursor-pointer font-semibold text-slate-700">Ingredientes y preparación</summary>
                <p class="mt-1 text-emerald-800">${v.ingr}</p>
                <ol class="list-decimal pl-4 mt-1 space-y-0.5">${v.steps.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ol></details>
            <div class="flex gap-2"><button onclick="swapDish('${meal}')" class="flex-1 text-xs bg-slate-100 text-slate-700 font-semibold py-2 rounded-lg cursor-pointer"><i class="fa-solid fa-rotate-right mr-1" aria-hidden="true"></i>Otro plato</button>
            <button onclick="useMenuDish('${meal}')" class="flex-1 text-xs bg-emerald-600 text-white font-semibold py-2 rounded-lg cursor-pointer">Usar en diario</button></div></div>`;
    }).join('');
    const bar = (v, t, l, u) => { const p = menuPct(v, t); return `<div class="text-center"><p class="text-sm font-bold text-slate-900 leading-tight">${Math.round(v)}${u}</p><p class="text-[10px] text-slate-500">${l} · obj. ${t}${u}</p><div class="h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden"><div class="h-full ${p > 110 ? 'bg-amber-400' : 'bg-emerald-500'}" style="width:${Math.min(100, p)}%"></div></div><p class="text-[10px] text-slate-400">${p}%</p></div>`; };
    el.innerHTML = head + `${err}<div class="grid grid-cols-4 gap-2 bg-white rounded-xl border border-slate-100 p-2">${bar(tot.kcal, n.kcal, 'kcal', '')}${bar(tot.p, n.protein, 'prot.', ' g')}${bar(tot.c, n.carbs, 'hidr.', ' g')}${bar(tot.f, n.fat, 'grasas', ' g')}</div>
        ${blocks}
        <div class="flex gap-2">${aiOn ? `<button onclick="buildAiMenu()" class="flex-1 text-xs bg-amber-300 text-slate-950 font-bold py-2.5 rounded-xl cursor-pointer"><i class="fa-solid fa-wand-magic-sparkles mr-1" aria-hidden="true"></i>Otro menú con IA</button>` : ''}<button onclick="buildMenu(true)" class="flex-1 text-xs bg-slate-100 text-slate-700 font-semibold py-2.5 rounded-xl cursor-pointer">${aiOn ? 'Menú básico' : 'Otro menú'}</button></div>
        <button onclick="menuToShopping()" class="w-full text-xs bg-emerald-600 text-white font-bold py-2.5 rounded-xl cursor-pointer"><i class="fa-solid fa-cart-shopping mr-1" aria-hidden="true"></i>Crear lista de la compra</button>
        ${isAi && typeof menuState.remaining === 'number' ? `<p class="text-[10px] text-slate-400">Te quedan ${menuState.remaining} usos de IA hoy.</p>` : ''}
        <p class="text-[10px] text-slate-400">${isAi ? 'Generado por IA: las cifras son aproximadas y puede haber errores.' : 'Valores medios orientativos.'} Revisa alergias e intolerancias. No sustituye el consejo de un profesional sanitario.</p>`;
}
function useMenuDish(meal) {
    const T = menuTargets(); if (!T || !menuState.picks) return;
    const v = menuView(meal, T);
    sendToMeal(meal, v.title, { kcal: Math.round(v.m.kcal), protein: Math.round(v.m.p) });
}

// ---------- Secciones de la pestaña Recetas (una a la vez, para no abrumar) ----------
const REC_SECTIONS = ['menu', 'ideas', 'compra', 'guardadas'];
let recSection = 'menu';
function setRecSection(id, scroll = true) {
    if (!REC_SECTIONS.includes(id)) id = 'menu';
    recSection = id;
    document.querySelectorAll('[data-rsec]').forEach(el => el.classList.toggle('hidden', el.dataset.rsec !== id));
    REC_SECTIONS.forEach(s => {
        const b = document.getElementById('rec-t-' + s); if (!b) return;
        const on = s === id;
        b.classList.toggle('bg-white', on); b.classList.toggle('shadow-sm', on); b.classList.toggle('text-emerald-700', on); b.classList.toggle('text-slate-500', !on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}
function updateRecBadge() {
    const b = document.getElementById('rec-badge'); if (!b) return;
    const n = getShop().filter(x => !x.done).length;
    b.textContent = n > 99 ? '99+' : n; b.classList.toggle('hidden', !n);
}

// ---------- Lista de la compra (guardada y sincronizada: dreamfit_shop) ----------
// items: [{ id, n: nombre, q: cantidad (texto), c: sección, g: gramos totales (solo si viene del menú), key: alimento, done }]
const getShop = () => { const s = safeParse('dreamfit_shop', []); return Array.isArray(s) ? s.filter(x => x && typeof x.n === 'string') : []; };
const saveShop = a => DB.setItem('dreamfit_shop', JSON.stringify(a.slice(0, 120)));
const shopId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function menuNeeds() { // alimentos y gramos del menú actual (con las raciones ajustadas)
    const T = menuTargets(), need = {}; if (!T || !menuState.picks) return need;
    MENU_MEALS.forEach(meal => { const d = getDish(menuState.picks[meal]), k = dishScale(d, T.meals[meal]); d.i.forEach(([key, g]) => { need[key] = (need[key] || 0) + g * k; }); });
    return need;
}
function aiMenuItems() { // ingredientes del menú de la IA, juntando repetidos
    const by = {};
    MENU_MEALS.forEach(k => { ((menuState.ai || {})[k] || { ingredients: [] }).ingredients.forEach(x => {
        const key = x.name.toLowerCase(), cur = by[key] || (by[key] = { n: x.name, c: SHOP_CATS[x.section] ? x.section : 'otros', q: [] });
        if (x.amount) cur.q.push(x.amount);
    }); });
    return Object.values(by).map(x => ({ n: x.n, c: x.c, q: x.q.join(' + ') }));
}
function menuToShopping() {
    if (menuState.ai) {
        const raw = (document.getElementById('user-ingredients') || { value: '' }).value, have = raw.trim() ? parseIngredients(raw).have : new Set();
        const items = aiMenuItems().filter(x => { const k = parseIngredients(x.n).have; return ![...k].some(y => have.has(y)); });
        saveShop([...getShop().filter(x => !x.key && !x.menu), ...items.map(x => ({ id: shopId(), n: x.n, q: x.q, c: x.c, menu: true, done: false }))]); renderShopCard();
        showToast('Lista de la compra creada'); setRecSection('compra');
        return;
    }
    const need = menuNeeds(); if (!Object.keys(need).length) return;
    const raw = (document.getElementById('user-ingredients') || { value: '' }).value;
    const have = raw.trim() ? parseIngredients(raw).have : new Set();
    const old = getShop(), keep = old.filter(x => !x.key && !x.menu); // lo escrito a mano o de la IA se conserva; lo del menú anterior se sustituye
    const added = [], skipped = [];
    Object.entries(need).forEach(([key, g]) => {
        const f = FOODS[key];
        if (f.k && have.has(f.k)) { skipped.push(f.n); return; }
        added.push({ id: shopId(), n: f.n, q: amountText(key, g), c: f.c, g: Math.round(g), key, done: false });
    });
    saveShop([...keep, ...added]); renderShopCard();
    showToast(skipped.length ? `Lista creada (sin lo que ya tienes: ${skipped.length})` : 'Lista de la compra creada');
    setRecSection('compra');
}
function addAiToShopping(i) { // ingredientes de una receta de la IA
    const r = aiState.items[i]; if (!r) return;
    const list = getShop(), has = new Set(list.map(x => x.n.toLowerCase()));
    r.ingredients.forEach(x => { if (!has.has(x.name.toLowerCase())) { list.push({ id: shopId(), n: x.name, q: x.amount || '', c: 'otros', done: false }); has.add(x.name.toLowerCase()); } });
    saveShop(list); renderShopCard(); showToast('Añadido a la lista de la compra');
}
function addShopItem() {
    const i = document.getElementById('shop-new'); if (!i) return;
    const v = i.value.trim().slice(0, 60); if (!v) return;
    const list = getShop(); list.push({ id: shopId(), n: v, q: '', c: 'otros', done: false });
    saveShop(list); i.value = ''; renderShopCard();
    const n = document.getElementById('shop-new'); if (n) n.focus();
}
function toggleShop(id) { const l = getShop(), it = l.find(x => x.id === id); if (it) { it.done = !it.done; saveShop(l); renderShopCard(); } }
function removeShop(id) { saveShop(getShop().filter(x => x.id !== id)); renderShopCard(); }
function clearDoneShop() { saveShop(getShop().filter(x => !x.done)); renderShopCard(); }
async function clearShop() { if (await UI.confirm({ title: '¿Vaciar la lista de la compra?', confirmText: 'Vaciar', tone: 'danger' })) { saveShop([]); renderShopCard(); } }
function shopText() {
    const l = getShop().filter(x => !x.done); if (!l.length) return '';
    return 'Lista de la compra\n' + Object.keys(SHOP_CATS).map(c => { const a = l.filter(x => (SHOP_CATS[x.c] ? x.c : 'otros') === c); return a.length ? `\n${SHOP_CATS[c][1]}\n` + a.map(x => `- ${x.n}${x.q ? ' (' + x.q + ')' : ''}`).join('\n') : ''; }).join('');
}
async function copyShop() {
    const t = shopText(); if (!t) { showToast('No hay nada pendiente que copiar.'); return; }
    try { await navigator.clipboard.writeText(t); showToast('Lista copiada'); }
    catch { window.prompt('Copia tu lista:', t); }
}
function renderShopCard() {
    updateRecBadge();
    const el = document.getElementById('shop-card'); if (!el) return;
    const l = getShop(), pend = l.filter(x => !x.done).length;
    const row = x => `<li class="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0"><label class="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"><input type="checkbox" ${x.done ? 'checked' : ''} onchange="toggleShop('${x.id}')" class="w-4 h-4 accent-emerald-600"><span class="text-xs ${x.done ? 'line-through text-slate-400' : 'text-slate-700'} truncate">${escapeHtml(x.n)}${x.q ? ` <span class="text-slate-400">· ${escapeHtml(x.q)}</span>` : ''}</span></label><button onclick="removeShop('${x.id}')" class="text-slate-300 hover:text-red-500 text-xs px-1 cursor-pointer" aria-label="Quitar ${escapeHtml(x.n)}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></li>`;
    const groups = Object.keys(SHOP_CATS).map(c => { const a = l.filter(x => (SHOP_CATS[x.c] ? x.c : 'otros') === c); return a.length ? `<div><p class="text-[11px] font-bold text-slate-500 mt-2">${SHOP_CATS[c][0]} ${SHOP_CATS[c][1]}</p><ul>${a.map(row).join('')}</ul></div>` : ''; }).join('');
    el.innerHTML = `<div class="flex justify-between items-center gap-2"><h2 class="font-bold text-base text-slate-900 flex items-center gap-2"><i class="fa-solid fa-cart-shopping text-emerald-600" aria-hidden="true"></i> Lista de la compra</h2><span class="text-[11px] text-slate-500">${l.length ? pend + ' pendientes' : ''}</span></div>
        ${l.length ? groups : '<p class="text-xs text-slate-500">Vacía. Crea tu menú del día y pulsa «Lista de la compra», o añade lo que necesites aquí.</p>'}
        <div class="flex gap-2"><input id="shop-new" type="text" maxlength="60" placeholder="Añadir producto…" onkeydown="if(event.key==='Enter')addShopItem()" class="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"><button onclick="addShopItem()" class="bg-emerald-600 text-white font-bold px-3 rounded-xl text-xs cursor-pointer" aria-label="Añadir"><i class="fa-solid fa-plus" aria-hidden="true"></i></button></div>
        ${l.length ? `<div class="flex gap-2 text-[11px] font-semibold"><button onclick="copyShop()" class="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg cursor-pointer">Copiar</button><button onclick="clearDoneShop()" class="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg cursor-pointer">Quitar marcados</button><button onclick="clearShop()" class="flex-1 bg-slate-100 text-red-600 py-2 rounded-lg cursor-pointer">Vaciar</button></div>` : ''}`;
}
