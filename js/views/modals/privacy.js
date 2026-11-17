// Hoja con la política de privacidad (el texto vive en js/privacy.js). Está por encima de la pantalla de acceso (z-70).
Views.addModal('privacy', `
<div id="privacy-modal" role="dialog" aria-modal="true" aria-labelledby="privacy-title" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[75] hidden items-end sm:items-center justify-center p-3">
    <div class="bg-white rounded-2xl max-w-md w-full max-h-[88vh] flex flex-col shadow-xl">
        <div class="flex justify-between items-center p-4 border-b border-slate-100">
            <h2 id="privacy-title" class="font-bold text-base text-slate-900">Política de privacidad</h2>
            <button id="privacy-close" aria-label="Cerrar" onclick="closePrivacy()" class="text-slate-500 hover:text-slate-600 cursor-pointer w-8 h-8"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
        <div id="privacy-body" class="p-4 overflow-y-auto"></div>
        <div class="p-3 border-t border-slate-100"><button onclick="closePrivacy()" class="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-emerald-700">Entendido</button></div>
    </div>
</div>
`);
