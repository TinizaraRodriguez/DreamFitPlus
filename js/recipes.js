const initialRecipes = [
    { id: 1, title: 'Porridge anti-galletas (Sustituto nocturno)', desc: '3 cucharadas soperas de copos de avena + 1 vaso de leche al microondas 1,5 min con canela.', target: 'dinner', tag: 'Cena / Anti-Ansiedad' },
    { id: 2, title: 'Bocadillo Energético Fitness', desc: 'Pan 100% integral untado con tomate natural, aceite de oliva y 3 lonchas de pechuga de pavo (>90%).', target: 'morn', tag: 'Tentempié 10-11h' },
    { id: 3, title: 'Yogur Proteico Anti-Picoteo', desc: '1 yogur alto en proteína mezclado con un puñado pequeño de almendras o nueces crudas.', target: 'snack', tag: 'Merienda' }
];

let genState = { items: [], goal: 'dinner' };

function generateCustomRecipe(more = false) {
    const raw = document.getElementById('user-ingredients').value.trim();
    const goal = document.getElementById('user-goal').value, flavor = document.getElementById('user-flavor').value;
    if (!raw) { showToast('Escribe al menos 2 o 3 ingredientes.'); return; }
    const res = suggestRecipes(raw, goal, flavor);
    const box = document.getElementById('custom-recipe-result');
    box.classList.remove('hidden');
    const note = res.unknown.length ? `<p class="text-[11px] text-slate-500">No he reconocido: ${escapeHtml(res.unknown.join(', '))}. Los tendré en cuenta como extras de despensa.</p>` : '';
    if (!res.list.length) {
        genState.items = [];
        box.innerHTML = `<p class="text-xs text-slate-700">Con eso aún no puedo montar un plato ${flavor}. Prueba a añadir una base (pasta, arroz, huevos, pan, avena, yogur, leche...).</p>${note}`;
        return;
    }
    const n = res.list.length, prev = genState.more || 0;
    const offset = more && n > 3 ? (prev + 3) % n : 0;
    genState = { items: [], goal, more: offset, flavor };
    for (let i = 0; i < Math.min(3, n); i++) genState.items.push(res.list[(offset + i) % n]);

    box.innerHTML = `<p class="text-[11px] font-semibold text-slate-500">Ideas para ${MEAL_NAME[goal]} · ${res.have.size} ingredientes reconocidos</p>` + note +
        genState.items.map((it, i) => {
            const r = it.r, extras = it.opt.map(k => r.x && r.x[k]).filter(Boolean);
            const why = it.missing.length ? `Casi: te falta ${it.missing[0]}.` : `Aprovecha ${it.used.length} de tus ${res.have.size} ingredientes.`;
            return `<div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                <div class="flex justify-between items-start gap-2"><h4 class="font-bold text-sm text-slate-900">${escapeHtml(r.n)}</h4><span class="text-[10px] font-semibold text-slate-500 whitespace-nowrap">⏱ ${r.t}</span></div>
                <div class="flex flex-wrap gap-1.5"><span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">${r.g}</span>${it.fits ? '' : `<span class="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">Más típica de otro momento</span>`}</div>
                <p class="text-[11px] text-emerald-700">Con: ${it.used.map(show).join(', ')}</p>
                <ol class="list-decimal pl-4 text-xs text-slate-600 space-y-1">${r.s.concat(extras).map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
                <p class="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg">💡 ${why} Sal, aceite y pimienta se dan por supuestos.</p>
                <div class="flex gap-2"><button onclick="saveGenerated(${i})" class="flex-1 text-xs bg-slate-100 text-slate-700 font-semibold py-2 rounded-lg cursor-pointer">Guardar</button>
                <button onclick="useGenerated(${i})" class="flex-1 text-xs bg-emerald-600 text-white font-semibold py-2 rounded-lg cursor-pointer">Usar en diario</button></div>
            </div>`;
        }).join('') + (n > 3 ? `<button onclick="generateCustomRecipe(true)" class="w-full text-xs text-emerald-700 font-bold py-2 bg-emerald-50 rounded-xl cursor-pointer">Otras ideas</button>` : '');
}
function useGenerated(i) { const it = genState.items[i]; if (it) sendToMeal(genState.goal, it.r.n); }
function saveGenerated(i) {
    const it = genState.items[i];
    if (!it) return;
    const extras = it.opt.map(k => it.r.x && it.r.x[k]).filter(Boolean);
    addRecipeToCatalog({ id: Date.now() + i, title: it.r.n, desc: `Con: ${it.used.map(show).join(', ')}. ${it.r.s.concat(extras).join(' ')}`, target: genState.goal, tag: 'Generada' });
    showToast('¡Receta guardada!');
}

// ---------- Generador con IA ----------
let aiState = { items: [], goal: 'dinner', busy: false };
function updateAiUI() {
    const on = AiRecipes.enabled();
    ['ai-extra', 'ai-btn'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.toggle('hidden', !on); });
}
async function generateAiRecipe(more = false) {
    if (aiState.busy) return;
    const raw = document.getElementById('user-ingredients').value.trim();
    const goal = document.getElementById('user-goal').value, flavor = document.getElementById('user-flavor').value;
    const restrictions = (document.getElementById('user-restrictions') || { value: '' }).value.trim();
    const box = document.getElementById('custom-recipe-result'), btn = document.getElementById('ai-btn');
    const avoid = more ? aiState.items.map(r => r.title) : [];
    aiState.busy = true; btn.disabled = true; btn.dataset.t = btn.dataset.t || btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Pensando…';
    box.classList.remove('hidden');
    box.innerHTML = '<p class="text-xs text-slate-500" role="status">La IA está preparando tus recetas… puede tardar unos segundos.</p>';
    try {
        const d = await AiRecipes.generate({ ingredients: raw, goal, flavor, restrictions, avoid, nutrition: nutritionTarget(goal) || undefined });
        aiState = { items: d.recipes, goal, flavor, remaining: d.remaining, limit: d.limit, busy: false };
        renderAiResult();
    } catch (e) {
        aiState.busy = false;
        box.innerHTML = `<p role="alert" class="text-xs text-red-600">${escapeHtml(AiRecipes.message(e))}</p>
            <button onclick="generateCustomRecipe()" class="w-full text-xs text-emerald-700 font-bold py-2 bg-emerald-50 rounded-xl cursor-pointer">Usar el generador básico (sin IA)</button>`;
    } finally { btn.disabled = false; btn.innerHTML = btn.dataset.t; aiState.busy = false; }
}
function renderAiResult() {
    const box = document.getElementById('custom-recipe-result'), s = aiState;
    box.classList.remove('hidden');
    box.innerHTML = `<p class="text-[11px] font-semibold text-slate-500"><i class="fa-solid fa-wand-magic-sparkles text-amber-500"></i> Ideas de la IA para ${MEAL_NAME[s.goal]}${typeof s.remaining === 'number' ? ' · te quedan ' + s.remaining + ' hoy' : ''}</p>` +
        s.items.map((r, i) => `<div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
            <h4 class="font-bold text-sm text-slate-900">${escapeHtml(r.title)}</h4>
            <div class="flex flex-wrap gap-1.5 text-[10px] font-bold">
                ${r.time_min ? `<span class="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">⏱ ${r.time_min} min</span>` : ''}
                ${r.calories ? `<span class="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">≈ ${r.calories} kcal</span>` : ''}
                ${r.protein_g ? `<span class="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">≈ ${r.protein_g} g proteína</span>` : ''}
                ${r.carbs_g ? `<span class="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">≈ ${r.carbs_g} g hidratos</span>` : ''}${r.fat_g ? `<span class="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">≈ ${r.fat_g} g grasas</span>` : ''}
            </div>
            <p class="text-[11px] text-emerald-700">Ingredientes: ${r.ingredients.map(x => escapeHtml(x.name + (x.amount ? ' (' + x.amount + ')' : ''))).join(', ')}</p>
            <ol class="list-decimal pl-4 text-xs text-slate-600 space-y-1">${r.steps.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ol>
            ${r.tip ? `<p class="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg">💡 ${escapeHtml(r.tip)}</p>` : ''}
            <div class="flex gap-2"><button onclick="saveAiRecipe(${i})" class="flex-1 text-xs bg-slate-100 text-slate-700 font-semibold py-2 rounded-lg cursor-pointer">Guardar</button>
            <button onclick="addAiToShopping(${i})" class="flex-1 text-xs bg-slate-100 text-slate-700 font-semibold py-2 rounded-lg cursor-pointer"><i class="fa-solid fa-cart-shopping mr-1" aria-hidden="true"></i>Compra</button>
            <button onclick="useAiRecipe(${i})" class="flex-1 text-xs bg-emerald-600 text-white font-semibold py-2 rounded-lg cursor-pointer">Usar en diario</button></div>
        </div>`).join('') +
        `<button onclick="generateAiRecipe(true)" class="w-full text-xs text-emerald-700 font-bold py-2 bg-emerald-50 rounded-xl cursor-pointer">Otras ideas con IA</button>
        <p class="text-[10px] text-slate-400">Generado por IA: las calorías son aproximadas y puede haber errores. Revisa siempre alergias e intolerancias. No sustituye el consejo de un profesional.</p>`;
}
function useAiRecipe(i) { const r = aiState.items[i]; if (r) sendToMeal(aiState.goal, r.title, { kcal: numOr(r.calories) || 0, protein: numOr(r.protein_g) || 0 }); }
function saveAiRecipe(i) {
    const r = aiState.items[i];
    if (!r) return;
    const ing = r.ingredients.map(x => x.name + (x.amount ? ' (' + x.amount + ')' : '')).join(', ');
    const meta = [r.time_min && r.time_min + ' min', r.calories && '≈' + r.calories + ' kcal', r.protein_g && '≈' + r.protein_g + ' g proteína'].filter(Boolean).join(' · ');
    addRecipeToCatalog({ id: Date.now() + i, title: r.title, desc: `Ingredientes: ${ing}. ${r.steps.map((t, n) => (n + 1) + '. ' + t).join(' ')}${meta ? ' (' + meta + ')' : ''}`, target: aiState.goal, tag: 'IA', kcal: numOr(r.calories) || undefined, protein: numOr(r.protein_g) || undefined });
    showToast('¡Receta guardada!');
}

function getSavedRecipes() {
    const saved = DB.getItem('dreamfit_custom_recipes');
    return saved ? JSON.parse(saved) : structuredClone(initialRecipes);
}

function renderRecipesCatalog() {
    updateAiUI();
    const list = getSavedRecipes();
    const container = document.getElementById('recipes-catalog-list');
    document.getElementById('recipe-count-badge').innerText = list.length + ' recetas';
    if (typeof renderMealChips === 'function') renderMealChips();

    container.innerHTML = list.map(r => `
        <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-2">
            <div class="flex justify-between items-start">
                <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">${escapeHtml(r.tag || 'Guardada')}</span>
                <div class="flex gap-1">
                    <button aria-label="Eliminar receta" onclick="deleteRecipe(${r.id})" class="text-xs text-slate-500 hover:text-red-500 px-1 py-0.5"><i class="fa-solid fa-trash"></i></button>
                    <button onclick="useRecipe(${r.id})" class="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition cursor-pointer">
                        <i class="fa-solid fa-plus mr-1"></i> Usar en diario
                    </button>
                </div>
            </div>
            <h3 class="font-bold text-sm text-slate-900">${escapeHtml(r.title)}</h3>
            <p class="text-xs text-slate-600">${escapeHtml(r.desc)}</p>
        </div>
    `).join('');
}

function useRecipe(id) {
    const r = getSavedRecipes().find(x => x.id === id);
    if (r) sendToMeal(r.target || 'dinner', r.title);
}

function addRecipeToCatalog(newRec) {
    const list = getSavedRecipes();
    list.unshift(newRec);
    DB.setItem('dreamfit_custom_recipes', JSON.stringify(list));
    renderRecipesCatalog();
}

async function deleteRecipe(id) {
    if (await UI.confirm({ title: '¿Eliminar esta receta?', message: 'Se quitará de Mi Colección.', confirmText: 'Eliminar', tone: 'danger' })) {
        let list = getSavedRecipes();
        list = list.filter(r => r.id !== id);
        DB.setItem('dreamfit_custom_recipes', JSON.stringify(list));
        renderRecipesCatalog();
    }
}

function toggleManualForm() { document.getElementById('manual-recipe-form').classList.toggle('hidden'); }

function saveManualRecipe() {
    const title = document.getElementById('new-rec-title').value.trim();
    const desc = document.getElementById('new-rec-desc').value.trim();
    const target = document.getElementById('new-rec-target').value;
    if(!title) { showToast('Indica el nombre de la receta.'); return; }

    addRecipeToCatalog({ id: Date.now(), title: title, desc: desc || 'Sin descripción.', target: target, tag: 'Manual' });
    document.getElementById('new-rec-title').value = '';
    document.getElementById('new-rec-desc').value = '';
    toggleManualForm();
}