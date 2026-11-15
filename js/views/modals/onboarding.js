// Hoja de bienvenida / cambio de objetivo. Su contenido lo pinta js/onboarding.js.
Views.addModal('onboarding', `
<div id="ob-modal" role="dialog" aria-modal="true" aria-labelledby="ob-title" class="fixed inset-0 z-[60] hidden bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
    <div id="ob-sheet" class="bg-white w-full max-w-md max-h-[94vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl p-5 space-y-4 shadow-xl"></div>
</div>
`);
