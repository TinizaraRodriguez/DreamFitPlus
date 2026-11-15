// Hoja del protocolo anti-picoteo (SOS).
Views.addModal('sos', `
<div id="sos-modal" role="dialog" aria-modal="true" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
        <div class="flex justify-between items-center">
            <h3 class="font-bold text-base text-amber-600 flex items-center gap-2">
                <i class="fa-solid fa-circle-exclamation"></i> Protocolo Anti-Picoteo
            </h3>
            <button aria-label="Cerrar" onclick="closeSosModal()" class="text-slate-500 hover:text-slate-600 cursor-pointer"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
        <div id="sos-body" class="text-xs text-slate-600 space-y-3"></div>
    </div>
</div>
`);
