// ===== ALIMENTOS: buscar, escanear el envase con una foto y calcular lo que has comido =====
// Orden de fuentes: tus alimentos y los del catálogo compartido (datos reales del envase) → genéricos (aproximados).
// Con la foto de un envase, la IA lee la tabla nutricional; se guarda UNA vez en el catálogo compartido (Supabase, tabla «foods»)
// y cualquier otra persona ya lo encuentra sin subir foto. Las fotos no se guardan.
const FOOD_CACHE_KEY = 'dreamfit_myfoods';
const fnorm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const f1 = n => Math.round(n * 10) / 10;
const fmt1 = n => String(f1(n)).replace('.', ',');
const getMyFoods = () => { const l = safeParse(FOOD_CACHE_KEY, []); return Array.isArray(l) ? l : []; };
function cacheFood(f) {
    if (!f || f.src === 'generic') return;
    const k = fnorm(f.name + ' ' + (f.brand || '')), l = getMyFoods().filter(x => fnorm(x.name + ' ' + (x.brand || '')) !== k && !(f.id && x.id === f.id));
    l.unshift(f); DB.setItem(FOOD_CACHE_KEY, JSON.stringify(l.slice(0, 150)));
}
const foodOnline = () => typeof Auth !== 'undefined' && Auth.mode === 'supabase' && !!Auth.user && typeof SupabaseBackend !== 'undefined' && !!SupabaseBackend.client;
const foodScanOn = () => foodOnline() && (window.DREAMFIT_CONFIG || {}).AI_RECIPES === true;

// fila de la tabla «foods» → alimento de la app
const rowToFood = r => ({ id: r.id, src: 'shared', name: r.name, brand: r.brand || '', barcode: r.barcode || '', k: +r.kcal100, p: +r.protein100, c: +r.carbs100, f: +r.fat100,
    sugar: r.sugar100 == null ? null : +r.sugar100, fiber: r.fiber100 == null ? null : +r.fiber100, salt: r.salt100 == null ? null : +r.salt100, un: r.unit_name || '', ug: r.unit_g ? +r.unit_g : 0, ing: r.ingredients || '' });
const foodToRow = f => ({ name: f.name, brand: f.brand || '', barcode: f.barcode || '', kcal100: f.k, protein100: f.p, carbs100: f.c, fat100: f.f, sugar100: f.sugar ?? '', fiber100: f.fiber ?? '', salt100: f.salt ?? '', unit_name: f.un || '', unit_g: f.ug || '', ingredients: f.ing || '' });
function genericFoods() {
    return Object.entries(typeof FOODS === 'object' ? FOODS : {}).map(([id, o]) => ({ id: 'g:' + id, src: 'generic', name: o.n, brand: '', k: o.e[0], p: o.e[1], c: o.e[2], f: o.e[3], un: o.u ? o.u[1] : '', ug: o.u ? o.u[0] : 0 }));
}
function searchLocalFoods(q) {
    const toks = fnorm(q).split(' ').filter(Boolean); if (!toks.length) return [];
    const hit = f => { const h = fnorm(f.name + ' ' + (f.brand || '')); return toks.every(t => h.includes(t)); };
    return [...getMyFoods().filter(hit), ...genericFoods().filter(hit)];
}
async function searchSharedFoods(q) { // catálogo compartido
    if (!foodOnline()) return [];
    const toks = fnorm(q).split(' ').filter(t => t.length > 1).slice(0, 4); if (!toks.length) return [];
    try {
        const { data, error } = await SupabaseBackend.client.from('foods').select('*').ilike('name_key', '%' + toks.join('%') + '%').limit(8);
        return error ? [] : (data || []).map(rowToFood);
    } catch { return []; }
}
// Cantidad escrita como la diría una persona: «2 lonchas», «150 g», «1,5 yogures», «3»
function parseQty(text, food) {
    const m = /^\s*(\d+(?:[.,]\d+)?)\s*([a-zA-ZáéíóúñÁÉÍÓÚ.]*)/.exec(String(text || '')); if (!m) return null;
    const n = parseFloat(m[1].replace(',', '.')), w = fnorm(m[2]);
    if (!(n > 0)) return null;
    let grams;
    if (/^(kg|kilo|kilos)$/.test(w)) grams = n * 1000;
    else if (/^(g|gr|grs|gramo|gramos|ml)$/.test(w)) grams = n;
    else if (food.ug && (w === '' ? n <= 30 : true)) grams = n * food.ug; // sin unidad: números pequeños = unidades
    else grams = n;
    if (!(grams > 0) || grams > 3000) return null;
    const unit = food.ug && Math.abs(grams / food.ug - Math.round(grams / food.ug * 2) / 2) < 0.01 && !/^(g|gr|grs|gramo|gramos|ml|kg|kilo|kilos)$/.test(w) ? grams / food.ug : 0;
    return { grams, units: unit };
}
const foodMacros = (food, grams) => { const r = grams / 100; return { kcal: food.k * r, p: food.p * r, c: food.c * r, f: food.f * r }; };
const qtyLabel = (food, q) => q.units ? `${String(f1(q.units)).replace('.', ',')} ${food.un}${q.units === 1 ? '' : (/[aeiou]$/i.test(food.un) ? 's' : 'es')}` : `${Math.round(q.grams)} g`;

// ---- estado de la hoja ----
let foodUI = { q: '', results: [], sel: null, qty: '', edit: null, busy: false, msg: '', draft: [], tok: 0, base: null };
const foodPanelEl = () => document.getElementById('food-panel');
function foodsResetDraft() { foodUI = { q: '', results: [], sel: null, qty: '', edit: null, busy: false, msg: '', draft: [], tok: 0, base: null }; renderFoodPanel(); }

let foodTimer = 0;
function onFoodSearch(v) {
    foodUI.q = v; foodUI.sel = null; foodUI.msg = ''; const tok = ++foodUI.tok;
    foodUI.results = v.trim().length >= 2 ? searchLocalFoods(v) : [];
    renderFoodResults();
    clearTimeout(foodTimer);
    if (v.trim().length < 2) return;
    foodTimer = setTimeout(async () => {
        const shared = await searchSharedFoods(v); if (tok !== foodUI.tok || !shared.length) return;
        const seen = new Set(foodUI.results.map(x => fnorm(x.name + ' ' + (x.brand || ''))));
        const add = shared.filter(x => !seen.has(fnorm(x.name + ' ' + (x.brand || ''))));
        foodUI.results = [...add, ...foodUI.results]; renderFoodResults();
    }, 350);
}
function pickFood(i) { foodUI.sel = foodUI.results[i] || null; foodUI.qty = ''; renderFoodPanel(); const e = document.getElementById('food-qty'); if (e) e.focus(); }
function onFoodQty(v) { foodUI.qty = v; const el = document.getElementById('food-preview'); if (el) el.innerHTML = foodPreviewHtml(); const b = document.getElementById('food-add-btn'); if (b) b.disabled = !parseQty(v, foodUI.sel); }
function foodPreviewHtml() {
    const f = foodUI.sel, q = f && parseQty(foodUI.qty, f); if (!q) return `<span class="text-slate-500">Escribe cuánto: «${f && f.ug ? '2 ' + f.un + 's' : '150 g'}» o «100 g».</span>`;
    const m = foodMacros(f, q.grams); return `<b>${qtyLabel(f, q)}</b> ≈ ${Math.round(q.grams)} g · <b>${Math.round(m.kcal)} kcal</b> · ${fmt1(m.p)} g prot.`;
}
function addFoodToMeal() {
    const f = foodUI.sel, q = f && parseQty(foodUI.qty, f); if (!q) return;
    const m = foodMacros(f, q.grams), kEl = document.getElementById('meal-kcal'), pEl = document.getElementById('meal-prot'), tEl = document.getElementById('meal-edit-input');
    foodUI.draft.push({ food: f.name, label: qtyLabel(f, q), kcal: Math.round(m.kcal), p: f1(m.p), generic: f.src === 'generic' });
    foodsApplyDraft(); foodUI.sel = null; foodUI.q = ''; foodUI.results = []; foodUI.qty = ''; renderFoodPanel();
    const si = document.getElementById('food-search'); if (si) si.value = '';
}
function removeFoodDraft(i) { foodUI.draft.splice(i, 1); foodsApplyDraft(); renderFoodPanel(); }
// Escribe en la comida: texto + kcal + proteína sumando lo añadido con alimentos
function foodsApplyDraft() {
    const kEl = document.getElementById('meal-kcal'), pEl = document.getElementById('meal-prot'), tEl = document.getElementById('meal-edit-input');
    const base = foodUI.base || (foodUI.base = { text: tEl.value.trim(), kcal: numOr(kEl.value) || 0, p: numOr(pEl.value) || 0 });
    const sum = foodUI.draft.reduce((t, d) => ({ k: t.k + d.kcal, p: t.p + d.p }), { k: 0, p: 0 });
    const list = foodUI.draft.map(d => `${d.label} de ${d.food}`).join(', ');
    tEl.value = [base.text, list].filter(Boolean).join(base.text && list ? ' + ' : '');
    if (trackingOn()) { kEl.value = Math.round(base.kcal + sum.k) || ''; pEl.value = Math.round(base.p + sum.p) || ''; if (typeof renderPortions === 'function') renderPortions(); }
    if (!foodUI.draft.length) foodUI.base = null;
}

// ---- panel ----
function foodBadge(f) { return f.src === 'generic' ? '<span class="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">Genérico</span>' : '<span class="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">Del envase</span>'; }
function renderFoodResults() {
    const box = document.getElementById('food-results'); if (!box) return;
    const q = foodUI.q.trim();
    if (foodUI.sel || q.length < 2) { box.innerHTML = ''; return; }
    box.innerHTML = foodUI.results.slice(0, 7).map((f, i) => `<button type="button" onclick="pickFood(${i})" class="w-full flex items-center gap-2 text-left p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 cursor-pointer"><span class="flex-1 min-w-0"><span class="block text-xs font-semibold text-slate-800 truncate">${escapeHtml(f.name)}${f.brand ? ' · ' + escapeHtml(f.brand) : ''}</span><span class="block text-[10px] text-slate-500">${Math.round(f.k)} kcal · ${fmt1(f.p)} g prot. por 100 g${f.ug ? ` · 1 ${escapeHtml(f.un)} ≈ ${Math.round(f.ug)} g` : ''}</span></span>${foodBadge(f)}</button>`).join('')
        + (foodUI.results.length ? '' : '<p class="text-[11px] text-slate-500 px-1">No lo encuentro todavía.</p>')
        + `<div class="flex flex-wrap gap-x-4">${foodScanOn() ? `<button type="button" onclick="document.getElementById('food-photo').click()" class="text-left text-[11px] font-semibold text-emerald-700 p-2 cursor-pointer">📷 Foto del envase</button>` : ''}<button type="button" onclick="openFoodEditor()" class="text-left text-[11px] font-semibold text-emerald-700 p-2 cursor-pointer">＋ Añadir a mano</button></div>`;
}
function renderFoodPanel() {
    const el = foodPanelEl(); if (!el) return;
    if (foodUI.edit) { el.innerHTML = foodEditorHtml(); return; }
    const sel = foodUI.sel, scanBtn = foodScanOn() ? `<button type="button" onclick="document.getElementById('food-photo').click()" aria-label="Foto del envase" class="shrink-0 w-10 rounded-xl bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700"><i class="fa-solid fa-camera" aria-hidden="true"></i></button>` : '';
    const draft = foodUI.draft.map((d, i) => `<span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-900 text-[11px] font-semibold pl-2 pr-1 py-1 rounded-full max-w-full"><span class="truncate">${escapeHtml(d.label)} de ${escapeHtml(d.food)} · ${d.kcal} kcal${d.generic ? '*' : ''}</span><button type="button" aria-label="Quitar" onclick="removeFoodDraft(${i})" class="w-5 h-5 rounded-full text-emerald-800 cursor-pointer"><i class="fa-solid fa-xmark text-[10px]" aria-hidden="true"></i></button></span>`).join('');
    el.innerHTML = `<p class="text-[11px] font-semibold text-slate-500">Calcula con alimentos <span class="font-normal">(buscar o foto del envase)</span></p>
        <div class="flex gap-2"><input type="search" id="food-search" value="${escapeHtml(foodUI.q)}" oninput="onFoodSearch(this.value)" placeholder="Ej: queso en lonchas, yogur…" autocomplete="off" class="flex-1 min-w-0 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">${scanBtn}</div>
        <input type="file" id="food-photo" accept="image/*" capture="environment" class="hidden" onchange="onFoodPhoto(this)">
        ${foodUI.busy ? '<p role="status" class="text-[11px] text-emerald-700"><i class="fa-solid fa-spinner fa-spin mr-1" aria-hidden="true"></i>Leyendo el envase…</p>' : ''}
        ${foodUI.msg ? `<p role="alert" class="text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2">${escapeHtml(foodUI.msg)}</p>` : ''}
        <div id="food-results" class="space-y-1"></div>
        ${sel ? `<div class="bg-slate-50 rounded-xl p-2.5 space-y-2"><div class="flex items-center gap-2"><p class="flex-1 min-w-0 text-xs font-bold text-slate-800 truncate">${escapeHtml(sel.name)}${sel.brand ? ' · ' + escapeHtml(sel.brand) : ''}</p>${foodBadge(sel)}</div>
            <label class="block"><span class="text-[11px] text-slate-500">¿Cuánto has comido?${sel.ug ? ` (1 ${escapeHtml(sel.un)} ≈ ${Math.round(sel.ug)} g)` : ''}</span><input type="text" id="food-qty" inputmode="text" value="${escapeHtml(foodUI.qty)}" oninput="onFoodQty(this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();addFoodToMeal()}" placeholder="${sel.ug ? '2 ' + escapeHtml(sel.un) + 's  ·  o  ·  100 g' : '150 g'}" class="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"></label>
            <p id="food-preview" class="text-[11px] text-slate-700">${foodPreviewHtml()}</p>
            ${sel.src === 'generic' ? '<p class="text-[10px] text-slate-500">Valores genéricos aproximados. Con la foto del envase sería exacto.</p>' : '<button type="button" onclick="reportFood()" class="text-[10px] text-slate-400 underline cursor-pointer">Estos datos están mal</button>'}
            <div class="flex gap-2"><button type="button" onclick="foodUI.sel=null;renderFoodPanel()" class="px-3 bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-xs cursor-pointer">Atrás</button><button type="button" id="food-add-btn" onclick="addFoodToMeal()" ${parseQty(foodUI.qty, sel) ? '' : 'disabled'} class="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-lg text-xs cursor-pointer disabled:opacity-40">Añadir a la comida</button></div></div>` : ''}
        ${draft ? `<div class="flex flex-wrap gap-1.5">${draft}</div>${foodUI.draft.some(d => d.generic) ? '<p class="text-[10px] text-slate-400">* Valor genérico aproximado.</p>' : ''}` : ''}`;
    renderFoodResults();
}

// ---- editor (tras leer la foto, o a mano) ----
function openFoodEditor() {
    foodUI.edit = { fromPhoto: false, f: { name: foodUI.q.trim().replace(/^./, c => c.toUpperCase()), brand: '', k: '', p: '', c: '', f: '', un: '', ug: '' }, err: '' };
    renderFoodPanel();
}
function foodEditorHtml() {
    const e = foodUI.edit, f = e.f, fld = (k, label, unit, wide) => `<label class="${wide ? 'col-span-2' : ''} block"><span class="text-[10px] text-slate-500">${label}</span><div class="flex items-center gap-1"><input type="${unit === 'text' ? 'text' : 'number'}" ${unit === 'text' ? '' : 'inputmode="decimal" step="0.1" min="0"'} data-fe="${k}" value="${escapeHtml(f[k] ?? '')}" class="w-full min-w-0 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs">${unit === 'text' ? '' : `<span class="text-[10px] text-slate-500">${unit}</span>`}</div></label>`;
    return `<div class="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 space-y-2">
        <p class="text-xs font-bold text-emerald-900">${e.fromPhoto ? 'Esto es lo que he leído: revísalo' : 'Datos del alimento'}</p>
        ${e.check === 'revisar' ? '<p class="text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2">Los números no cuadran del todo entre sí: compruébalos con el envase.</p>' : ''}
        ${e.err ? `<p role="alert" class="text-[11px] text-red-600">${escapeHtml(e.err)}</p>` : ''}
        <div class="grid grid-cols-2 gap-2">${fld('name', 'Nombre', 'text', true)}${fld('brand', 'Marca (opcional)', 'text', true)}
            ${fld('k', 'Calorías por 100 g', 'kcal')}${fld('p', 'Proteínas por 100 g', 'g')}${fld('c', 'Hidratos por 100 g', 'g')}${fld('f', 'Grasas por 100 g', 'g')}
            ${fld('un', 'Una unidad es… (loncha, yogur)', 'text')}${fld('ug', 'Peso de 1 unidad', 'g')}</div>
        <p class="text-[10px] text-slate-500">${foodOnline() ? 'Se guardará en el catálogo compartido para que nadie tenga que repetir la foto. La foto no se guarda.' : 'Se guardará solo en este dispositivo (inicia sesión para compartirlo).'}</p>
        <div class="flex gap-2"><button type="button" onclick="foodUI.edit=null;renderFoodPanel()" class="px-3 bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-xs cursor-pointer">Cancelar</button><button type="button" onclick="saveFoodEditor()" class="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-lg text-xs cursor-pointer">Guardar y usar</button></div></div>`;
}
async function saveFoodEditor() {
    const e = foodUI.edit; if (!e) return;
    document.querySelectorAll('#food-panel [data-fe]').forEach(i => { e.f[i.dataset.fe] = i.value; });
    const f = e.f, n = k => numOr(f[k]), name = String(f.name || '').trim();
    const k = n('k'), p = n('p'), c = n('c'), fa = n('f');
    if (name.length < 2) { e.err = 'Pon el nombre del alimento.'; return renderFoodPanel(); }
    if (k === null || k < 0 || k > 900) { e.err = 'Las calorías por 100 g deben estar entre 0 y 900.'; return renderFoodPanel(); }
    if ([p, c, fa].some(v => v !== null && (v < 0 || v > 100))) { e.err = 'Proteínas, hidratos y grasas por 100 g van de 0 a 100.'; return renderFoodPanel(); }
    let ug = n('ug'); if (ug !== null && (ug < 1 || ug > 2000)) ug = null;
    let food = { id: 'l:' + Date.now().toString(36), src: 'manual', name, brand: String(f.brand || '').trim(), barcode: f.barcode || '', k, p: p || 0, c: c || 0, f: fa || 0, sugar: f.sugar ?? null, fiber: f.fiber ?? null, salt: f.salt ?? null, un: ug ? String(f.un || 'unidad').trim().slice(0, 24) : '', ug: ug || 0, ing: f.ing || '' };
    if (foodOnline()) { // al catálogo compartido (si ya existía, usamos el que había)
        try {
            const { data, error } = await SupabaseBackend.client.rpc('food_add', { p: foodToRow(food) });
            if (!error && data) { food = rowToFood(Array.isArray(data) ? data[0] : data); if (!food.un && ug) { food.un = String(f.un || 'unidad'); food.ug = ug; } }
            else if (error) foodUI.msg = 'No he podido compartirlo ahora; queda guardado en tu dispositivo.';
        } catch { foodUI.msg = 'No he podido compartirlo ahora; queda guardado en tu dispositivo.'; }
    }
    cacheFood(food);
    foodUI.edit = null; foodUI.sel = food; foodUI.qty = ''; foodUI.results = [];
    renderFoodPanel(); const q = document.getElementById('food-qty'); if (q) q.focus();
}
async function reportFood() {
    const f = foodUI.sel; if (!f || !foodOnline() || !/^[0-9a-f-]{36}$/i.test(f.id || '')) { showToast('Gracias, lo tendremos en cuenta'); return; }
    try { await SupabaseBackend.client.rpc('food_report', { p_id: f.id }); } catch { /* sin conexión */ }
    showToast('Gracias: con varios avisos se oculta el alimento');
}

// ---- foto del envase ----
function compressImage(file, max = 1280, q = 0.8) {
    return new Promise((res, rej) => {
        const url = URL.createObjectURL(file), img = new Image();
        img.onload = () => {
            const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
            c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
            res(c.toDataURL('image/jpeg', q).split(',')[1]);
        };
        img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
        img.src = url;
    });
}
async function scanFoodImage(b64) {
    const call = SupabaseBackend.client.functions.invoke('scan-food', { body: { image: b64 } });
    const timeout = new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), 60000));
    let res; try { res = await Promise.race([call, timeout]); } catch (e) { throw { code: e && e.code === 'timeout' ? 'timeout' : 'network' }; }
    if (res.error) throw await AiRecipes.readError(res.error);
    if (!res.data || !res.data.food) throw { code: 'unreadable' };
    return res.data.food;
}
async function onFoodPhoto(input) {
    const file = input.files && input.files[0]; input.value = '';
    if (!file || foodUI.busy) return;
    foodUI.busy = true; foodUI.msg = ''; renderFoodPanel();
    try {
        const food = await scanFoodImage(await compressImage(file));
        // ¿ya estaba en el catálogo? (mismo código de barras o mismo nombre y marca): usamos el que hay, sin duplicar
        let known = null;
        if (foodOnline()) { const found = await searchSharedFoods((food.name + ' ' + (food.brand || '')).trim()); known = found.find(x => (food.barcode && x.barcode === food.barcode) || fnorm(x.name + ' ' + x.brand) === fnorm(food.name + ' ' + food.brand)) || null; }
        foodUI.busy = false;
        if (known) { cacheFood(known); foodUI.sel = known; foodUI.qty = ''; foodUI.msg = 'Ya estaba en el catálogo: no hace falta subirlo otra vez.'; renderFoodPanel(); return; }
        foodUI.edit = { fromPhoto: true, check: food.check, err: '', f: { name: food.name, brand: food.brand, barcode: food.barcode, k: food.kcal100 ?? '', p: food.protein100 ?? '', c: food.carbs100 ?? '', f: food.fat100 ?? '', sugar: food.sugar100, fiber: food.fiber100, salt: food.salt100, un: food.unit_name || '', ug: food.unit_g || '', ing: food.ingredients || '' } };
    } catch (e) {
        foodUI.busy = false; foodUI.msg = AiRecipes.message(e).replace(/recetas con IA/, 'fotos');
        if (e && e.code === 'unreadable') foodUI.msg = 'No he podido leer la tabla nutricional. Prueba otra foto (de frente, con buena luz) o añádelo a mano.';
    }
    renderFoodPanel();
}
