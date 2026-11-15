// Vista: pestaña calendario. El marcado vive aquí; la lógica en js/calendar.js
Views.addTab({
    id: 'calendario',
    label: 'Plan',
    icon: 'fa-calendar-days',
    nav: true,   // false = no aparece en la barra inferior
    html: `
<div id="calendar-stats" class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3"></div>
<div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
    <div class="flex justify-between items-center">
        <h2 class="font-bold text-base text-slate-900 flex items-center gap-2">
            <i class="fa-solid fa-calendar-days text-emerald-600"></i> Calendario Mensual
        </h2>
        <div class="flex items-center gap-1">
            <button onclick="goToToday()" class="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg mr-1 cursor-pointer">Hoy</button>
            <button aria-label="Mes anterior" onclick="changeMonth(-1)" class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold"><i class="fa-solid fa-chevron-left"></i></button>
            <span id="calendar-month-year" class="text-xs font-bold text-slate-800 px-2">Cargando...</span>
            <button aria-label="Mes siguiente" onclick="changeMonth(1)" class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
    </div>

    <div class="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        <div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div><div>Dom</div>
    </div>

    <div id="calendar-grid" class="grid grid-cols-7 gap-1"></div>

    <div class="flex flex-wrap gap-x-4 gap-y-1 justify-center text-[11px] text-slate-500 pt-1 border-t border-slate-100">
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Realizado</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full border border-slate-400 inline-block"></span> Planificado</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded bg-emerald-600 inline-block"></span> Hoy</span>
    </div>
</div>

<!-- Detalle del día seleccionado -->
<div id="selected-day-detail" class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
    <div class="flex justify-between items-center border-b border-slate-100 pb-2">
        <h3 class="font-bold text-sm text-slate-900" id="selected-day-title">Selecciona un día</h3>
        <span id="selected-day-status" class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">-</span>
    </div>
    <div id="selected-day-content" class="text-xs text-slate-600 space-y-2">
        <p class="text-slate-500 italic">Toca cualquier número en el calendario para consultar o modificar la actividad correspondiente.</p>
    </div>
</div>

<!-- Plan semanal -->
<div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3">
    <div class="flex justify-between items-center">
        <h3 class="font-bold text-sm text-slate-900 flex items-center gap-2"><i class="fa-solid fa-sliders text-emerald-600"></i> Plan semanal</h3>
        <button id="plan-edit-btn" aria-expanded="false" onclick="togglePlanEditor()" class="text-xs text-emerald-700 font-bold px-3 py-1.5 bg-emerald-50 rounded-lg cursor-pointer">Editar</button>
    </div>
    <div id="week-strip" class="grid grid-cols-7 gap-1"></div>

    <div id="plan-editor" class="hidden space-y-3 pt-3 border-t border-slate-100">
        <p class="text-[11px] text-slate-500">Rutina habitual: se repite cada semana. Los cambios se aplican al pulsar Guardar.</p>
        <div id="agenda-cards-container" class="space-y-2 text-xs"></div>
        <div class="flex gap-2">
            <button id="plan-save-btn" onclick="saveWeeklyPlan()" disabled class="flex-1 bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer disabled:opacity-40 disabled:cursor-default">Guardar cambios</button>
            <button id="plan-discard-btn" onclick="discardWeeklyPlan()" disabled class="px-4 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-xs cursor-pointer disabled:opacity-40 disabled:cursor-default">Descartar</button>
        </div>
        <div class="pt-3 border-t border-slate-100 space-y-2">
            <p class="text-[11px] font-semibold text-slate-600">Añadir tipo de entreno propio</p>
            <div class="flex gap-2">
                <input type="text" id="new-category-name" aria-label="Nombre del nuevo tipo de entreno" placeholder="Ej: Pilates, Pádel..." class="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <button onclick="addCustomCategory()" class="bg-emerald-600 text-white font-bold px-3 py-2 rounded-xl text-xs cursor-pointer">Añadir</button>
            </div>
            <div id="custom-category-list" class="flex flex-wrap gap-2"></div>
        </div>
        <button onclick="resetWeeklyAgenda()" class="text-[11px] text-slate-500 underline cursor-pointer">Restablecer al plan inicial</button>
    </div>
</div>
`
});
