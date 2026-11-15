// Vista: pestaña entreno. El marcado vive aquí; la lógica en js/workout.js
Views.addTab({
    id: 'entreno',
    label: 'Entreno',
    icon: 'fa-person-running',
    nav: true,   // false = no aparece en la barra inferior
    html: `
<div class="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-5 rounded-2xl shadow-md space-y-3">
    <div class="flex justify-between items-start gap-2">
        <div>
            <span class="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Hoy toca</span>
            <h2 id="entreno-title" class="text-lg font-bold leading-tight">Cargando...</h2>
            <p id="entreno-sub" class="text-xs text-slate-300 mt-0.5"></p>
        </div>
        <span id="routine-focus-tag" class="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md whitespace-nowrap">-</span>
    </div>
    <details class="text-xs">
        <summary class="cursor-pointer text-emerald-300 underline">Cambiar actividad de hoy</summary>
        <select id="workout-type" aria-label="Actividad de hoy" onchange="onWorkoutTypeChange()" class="mt-2 w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white"></select>
    </details>
</div>
<div id="entreno-panel" class="space-y-4"></div>
`
});
