// Vista: pestaña hoy. El marcado vive aquí; la lógica en js/today.js
Views.addTab({
    id: 'hoy',
    label: 'Hoy',
    icon: 'fa-house',
    nav: true,   // false = no aparece en la barra inferior
    html: `
<div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
    <div class="flex justify-between items-start">
        <div>
            <span id="today-greeting" class="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Tu Panel Diario</span>
            <h2 class="text-lg font-bold text-slate-900" id="current-date-text">Hoy</h2>
        </div>
        <button onclick="resetDay()" aria-label="Reiniciar el día" class="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition cursor-pointer">
            <i class="fa-solid fa-rotate-right mr-1"></i> Reset
        </button>
    </div>
    <div id="today-summary" class="space-y-3"></div>
</div>

<!-- Revisión del plan (solo aparece cuando toca) -->
<div id="advice-card" class="hidden bg-white p-5 rounded-2xl shadow-sm border border-emerald-200 space-y-2.5"></div>

<!-- Botón SOS Anti-Picoteo -->
<div class="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 text-white shadow-md">
    <div class="flex items-center justify-between gap-3">
        <div>
            <h3 class="font-bold text-sm flex items-center gap-1.5"><i class="fa-solid fa-triangle-exclamation"></i> ¿Antojo o hambre entre horas?</h3>
            <p id="sos-week" class="text-xs text-amber-50 mt-0.5">Pulsa para frenar el picoteo y evaluar.</p>
        </div>
        <button onclick="openSosModal()" class="bg-white text-orange-600 font-bold text-xs px-3 py-2 rounded-xl shadow hover:bg-orange-50 transition cursor-pointer whitespace-nowrap">Ayuda SOS</button>
    </div>
</div>

<!-- Entreno de hoy (dinámico) -->
<div id="today-workout" class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3"></div>

<!-- Agua -->
<div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
    <div class="flex justify-between items-center">
        <h3 id="water-title" class="font-bold text-sm text-slate-900 flex items-center gap-2"><i class="fa-solid fa-droplet text-blue-500"></i> Hidratación (Meta: 2 L)</h3>
        <span class="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full" id="water-count">0 / 4 vasos</span>
    </div>
    <div id="water-buttons" class="flex flex-wrap gap-2 justify-between"></div>

    <p id="water-msg" class="text-[11px] text-blue-700"></p>
</div>

<!-- Comidas de hoy -->
<div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
    <div class="flex justify-between items-center gap-2">
        <h3 class="font-bold text-sm text-slate-900 flex items-center gap-2"><i class="fa-solid fa-bowl-food text-emerald-600"></i> Comidas de hoy <span id="meals-count" class="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">0/4</span></h3>
        <button onclick="openMealModal()" class="text-xs bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg cursor-pointer hover:bg-emerald-700">+ Añadir</button>
    </div>
    <div id="nut-day"></div>
    <div id="meals-list" class="space-y-1.5"></div>
    <div id="meals-store" class="hidden"></div>
</div>

<!-- Tu semana -->
<div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
    <h3 class="font-bold text-sm text-slate-900 flex items-center gap-2"><i class="fa-solid fa-chart-simple text-emerald-600"></i> Tu semana</h3>
    <div id="week-today" class="space-y-2"></div>
</div>
`
});
