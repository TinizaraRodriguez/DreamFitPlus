// Vista: pestaña progreso. El marcado vive aquí; la lógica en js/progress.js
Views.addTab({
    id: 'progreso',
    label: 'Progreso',
    icon: 'fa-chart-line',
    nav: true,   // false = no aparece en la barra inferior
    html: `
<div id="progress-summary" class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100"></div>

<div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
    <h2 class="font-bold text-base text-slate-900 flex items-center gap-2"><i class="fa-solid fa-weight-scale text-emerald-600"></i> Peso</h2>
    <div id="weight-summary"></div>
    <div id="weight-range" role="group" aria-label="Periodo de la gráfica" class="flex gap-1.5"></div>
    <div id="weight-chart" class="space-y-2"></div>
    <div class="grid grid-cols-2 gap-3 text-xs">
        <div>
            <label for="weight-kg" class="font-semibold text-slate-500">Peso (kg)</label>
            <input type="number" inputmode="decimal" step="0.1" id="weight-kg" oninput="previewWeight()" placeholder="Ej: 68,5" class="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none">
        </div>
        <div>
            <label for="weight-date" class="font-semibold text-slate-500">Fecha</label>
            <input type="date" id="weight-date" class="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none">
        </div>
    </div>
    <button onclick="saveWeight()" class="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-emerald-700 transition">Guardar peso</button>
    <div id="weight-list" class="text-xs text-slate-600 space-y-1.5"></div>
    <p class="text-[10px] text-slate-400">Tu peso más reciente actualiza automáticamente tus calorías, macros y agua.</p>
</div>

<div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
    <h2 class="font-bold text-base text-slate-900 flex items-center gap-2"><i class="fa-solid fa-ruler text-emerald-600"></i> Medidas</h2>
    <div id="measures-chart" class="space-y-2"></div>
    <div class="grid grid-cols-2 gap-3 text-xs">
        <div>
            <label for="measure-waist" class="font-semibold text-slate-500">Cintura (cm)</label>
            <input type="number" inputmode="decimal" step="0.1" id="measure-waist" oninput="previewMeasures()" placeholder="Ej: 75" class="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
        </div>
        <div>
            <label for="measure-hip" class="font-semibold text-slate-500">Cadera (cm)</label>
            <input type="number" inputmode="decimal" step="0.1" id="measure-hip" oninput="previewMeasures()" placeholder="Ej: 98" class="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
        </div>
    </div>
    <button onclick="saveMeasures()" class="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-emerald-700 transition">Guardar medidas</button>
    <div id="measures-list" class="text-xs text-slate-600 space-y-1.5"></div>
</div>

<div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
    <h3 class="font-bold text-sm text-slate-900 flex items-center gap-2"><i class="fa-solid fa-dumbbell text-emerald-600"></i> Fuerza</h3>
    <select id="progress-machine" aria-label="Máquina" onchange="renderStrengthProgress()" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"></select>
    <div id="strength-chart" class="space-y-2"></div>
</div>

<div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
    <h3 class="font-bold text-sm text-slate-900 flex items-center gap-2"><i class="fa-solid fa-person-running text-emerald-600"></i> Running · km por día</h3>
    <p id="run-info" class="text-[11px] text-slate-600 whitespace-pre-line"></p>
    <div class="flex gap-1.5 text-[11px] font-semibold">
        <button id="run-range-14" onclick="setRunRange(14)" class="px-3 py-1.5 rounded-lg cursor-pointer">14 días</button>
        <button id="run-range-30" onclick="setRunRange(30)" class="px-3 py-1.5 rounded-lg cursor-pointer">30 días</button>
    </div>
    <div id="run-chart"></div>
    <div class="grid grid-cols-2 gap-3 text-xs pt-1">
        <div><label for="run-add-km" class="font-semibold text-slate-500">Km corridos</label>
            <input type="number" inputmode="decimal" step="0.1" min="0" id="run-add-km" oninput="previewRun()" placeholder="Ej: 5.2" class="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"></div>
        <div><label for="run-add-date" class="font-semibold text-slate-500">Día</label>
            <input type="date" id="run-add-date" oninput="previewRun()" class="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"></div>
    </div>
    <button onclick="saveRunKm()" class="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-emerald-700 transition">Añadir carrera</button>
    <div id="run-list" class="text-xs space-y-1.5 pt-1"></div>
</div>
`
});
