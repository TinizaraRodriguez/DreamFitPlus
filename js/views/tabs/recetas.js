// Vista: pestaña recetas. El marcado vive aquí; la lógica en js/recipes.js
Views.addTab({
    id: 'recetas',
    label: 'Recetas',
    icon: 'fa-utensils',
    nav: true,   // false = no aparece en la barra inferior
    html: `
<div id="rec-nav" role="tablist" aria-label="Secciones de recetas" class="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-2xl text-[11px] font-bold">
    <button role="tab" id="rec-t-menu" onclick="setRecSection('menu')" class="py-2 rounded-xl cursor-pointer"><i class="fa-solid fa-utensils block text-sm mb-0.5" aria-hidden="true"></i>Menú</button>
    <button role="tab" id="rec-t-ideas" onclick="setRecSection('ideas')" class="py-2 rounded-xl cursor-pointer"><i class="fa-solid fa-wand-magic-sparkles block text-sm mb-0.5" aria-hidden="true"></i>Ideas</button>
    <button role="tab" id="rec-t-compra" onclick="setRecSection('compra')" class="py-2 rounded-xl cursor-pointer relative"><i class="fa-solid fa-cart-shopping block text-sm mb-0.5" aria-hidden="true"></i>Compra<span id="rec-badge" class="hidden absolute top-0.5 right-2 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-emerald-600 text-white text-[10px] leading-[1.1rem]"></span></button>
    <button role="tab" id="rec-t-guardadas" onclick="setRecSection('guardadas')" class="py-2 rounded-xl cursor-pointer"><i class="fa-solid fa-bowl-food block text-sm mb-0.5" aria-hidden="true"></i>Guardadas</button>
</div>

<div data-rsec="menu" class="space-y-6">
<div id="nutri-card" class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3"></div>

<div id="menu-card" class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3"></div>

</div>

<div data-rsec="compra" class="space-y-6 hidden">
<div id="shop-card" class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3"></div>
</div>

<div data-rsec="ideas" class="space-y-6 hidden">

<div class="bg-gradient-to-br from-teal-800 to-emerald-900 text-white p-5 rounded-2xl shadow-md space-y-4">
    <div class="flex items-center gap-2">
        <i class="fa-solid fa-wand-magic-sparkles text-amber-300 text-lg"></i>
        <h2 class="font-bold text-base">Generador por Alimentos disponibles</h2>
    </div>
    <p class="text-xs text-emerald-100">Pon lo que tienes en casa y te propongo ideas adaptadas al momento del día y al sabor. Con IA, si lo dejas vacío te propongo recetas a tus macros y lo que haya que comprar.</p>

    <div class="space-y-3 text-xs">
        <div>
            <label for="user-ingredients" class="block font-semibold text-emerald-200 mb-1">1. Alimentos que tienes en casa (también descuenta de tu lista de la compra):</label>
            <input type="text" id="user-ingredients" placeholder="Ej: huevos, atún, avena, espinacas, plátano..." class="w-full px-3 py-2 bg-emerald-950/60 border border-emerald-600/50 rounded-xl text-white placeholder-emerald-400/60">
        </div>

        <div class="flex gap-2">
            <div class="w-1/2">
                <label for="user-goal" class="block font-semibold text-emerald-200 mb-1">2. Objetivo / Momento:</label>
                <select id="user-goal" class="w-full px-2 py-2 bg-emerald-950/60 border border-emerald-600/50 rounded-xl text-white">
                    <option value="dinner">Cena / Anti-Ansiedad</option>
                    <option value="morn">Tentempié 10-11h</option>
                    <option value="snack">Merienda</option>
                    <option value="lunch">Almuerzo Principal</option>
                </select>
            </div>
            <div class="w-1/2">
                <label for="user-flavor" class="block font-semibold text-emerald-200 mb-1">3. Sabor:</label>
                <select id="user-flavor" class="w-full px-2 py-2 bg-emerald-950/60 border border-emerald-600/50 rounded-xl text-white">
                    <option value="salado">Salado</option>
                    <option value="dulce">Dulce (Sin azúcar)</option>
                </select>
            </div>
        </div>

        <div id="ai-extra" class="hidden">
            <label for="user-restrictions" class="block font-semibold text-emerald-200 mb-1">Alergias o restricciones (opcional, solo para la IA):</label>
            <input type="text" id="user-restrictions" maxlength="150" placeholder="Ej: sin gluten, alérgico a frutos secos, vegetariano..." class="w-full px-3 py-2 bg-emerald-950/60 border border-emerald-600/50 rounded-xl text-white placeholder-emerald-400/60">
            <p class="text-[10px] text-emerald-200/80 mt-1">Se envía a Google para generar la receta: no escribas datos que te identifiquen.</p>
        </div>

        <button id="ai-btn" onclick="generateAiRecipe()" class="hidden w-full bg-amber-300 hover:bg-amber-200 text-slate-950 font-bold py-2.5 rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Generar con IA
        </button>

        <button onclick="generateCustomRecipe()" class="w-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold py-2.5 rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-2">
            <i class="fa-solid fa-kitchen-set"></i> Generar ideas (básico)
        </button>
    </div>

    <div id="custom-recipe-result" class="hidden bg-white text-slate-800 p-4 rounded-xl space-y-3 mt-3"></div>
</div>

</div>

<div data-rsec="guardadas" class="space-y-6 hidden">
<div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3">
    <h3 class="font-bold text-sm text-slate-900 flex items-center justify-between">
        <span><i class="fa-solid fa-plus text-emerald-600 mr-1"></i> Añadir Receta al Recetario</span>
        <button onclick="toggleManualForm()" class="text-xs text-emerald-600 font-semibold underline cursor-pointer">Mostrar / Ocultar</button>
    </h3>
    
    <div id="manual-recipe-form" class="hidden space-y-2 text-xs pt-2 border-t border-slate-100">
        <input type="text" id="new-rec-title" placeholder="Nombre de la receta" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
        <textarea id="new-rec-desc" placeholder="Ingredientes y preparación rápida..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl h-16"></textarea>
        <select id="new-rec-target" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
            <option value="dinner">Usar preferentemente en: Cena</option>
            <option value="morn">Usar preferentemente en: 10:00 - 11:00h</option>
            <option value="snack">Usar preferentemente en: Merienda</option>
            <option value="lunch">Usar preferentemente en: Almuerzo</option>
        </select>
        <button onclick="saveManualRecipe()" class="w-full bg-slate-800 text-white font-bold py-2 rounded-xl cursor-pointer">
            Guardar en mi catálogo permanente
        </button>
    </div>
</div>

<div>
    <h3 class="font-bold text-sm text-slate-900 px-1 mb-3 flex justify-between items-center">
        <span>Mi Colección de Recetas</span>
        <span class="text-xs text-slate-500 font-normal" id="recipe-count-badge">0 recetas</span>
    </h3>
    <div id="recipes-catalog-list" class="space-y-3"></div>
</div>
</div>
`
});
