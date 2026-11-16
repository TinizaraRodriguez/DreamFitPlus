// Hoja para registrar una comida.
Views.addModal('meal', `
<div id="meal-modal" role="dialog" aria-modal="true" aria-labelledby="meal-modal-title" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 hidden items-end sm:items-center justify-center p-4">
    <div class="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-xl">
        <div class="flex justify-between items-center">
            <h3 id="meal-modal-title" class="font-bold text-base text-slate-900">Comida</h3>
            <button aria-label="Cerrar" onclick="closeMealModal()" class="text-slate-500 hover:text-slate-600 cursor-pointer"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
        <div id="meal-pills" class="grid grid-cols-4 gap-1.5"></div>
        <div>
            <label for="meal-edit-input" class="text-xs font-semibold text-slate-500">¿Qué has comido?</label>
            <input type="text" id="meal-edit-input" onkeydown="if(event.key==='Enter')saveMealModal()" placeholder="Ej: Pollo a la plancha + arroz integral" class="w-full mt-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
        </div>
        <div id="meal-nut" class="space-y-2">
            <p class="text-[11px] font-semibold text-slate-500">Calorías aproximadas <span class="font-normal">(opcional)</span></p>
            <div id="meal-portions" class="grid grid-cols-3 gap-1.5"></div>
            <div class="flex gap-2">
                <label class="flex-1"><span class="sr-only">Calorías</span><div class="flex items-center gap-1"><input type="number" inputmode="numeric" min="0" max="3000" id="meal-kcal" oninput="renderPortions()" placeholder="0" class="w-full min-w-0 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-center"><span class="text-[11px] text-slate-500">kcal</span></div></label>
                <label class="flex-1"><span class="sr-only">Proteína</span><div class="flex items-center gap-1"><input type="number" inputmode="numeric" min="0" max="200" id="meal-prot" oninput="renderPortions()" placeholder="0" class="w-full min-w-0 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-center"><span class="text-[11px] text-slate-500">g prot.</span></div></label>
            </div>
        </div>
        <div>
            <p class="text-[11px] font-semibold text-slate-500 mb-1.5">Tus recetas para esta comida</p>
            <div id="meal-modal-chips" class="flex flex-wrap gap-1.5"></div>
        </div>
        <div class="flex gap-2">
            <button onclick="clearMealModal()" class="px-4 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-xs cursor-pointer">Vaciar</button>
            <button onclick="saveMealModal()" class="flex-1 bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-emerald-700">Guardar</button>
        </div>
        <button onclick="closeMealModal(); switchTab('recetas')" class="w-full text-[11px] text-emerald-700 font-semibold underline cursor-pointer">Ver más recetas</button>
    </div>
</div>
`);
