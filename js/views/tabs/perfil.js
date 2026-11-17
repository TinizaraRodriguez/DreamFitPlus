// Vista: pestaña perfil. El marcado vive aquí; la lógica en js/auth.js
Views.addTab({
    id: 'perfil',
    label: 'Perfil y cuenta',
    icon: 'fa-user',
    nav: false,   // false = no aparece en la barra inferior
    html: `
<button onclick="closeProfile()" class="text-xs text-emerald-700 font-bold cursor-pointer"><i class="fa-solid fa-arrow-left mr-1"></i>Volver</button>
<h2 class="text-lg font-bold text-slate-900">Perfil y cuenta</h2>
<div id="account-card" class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3"></div>

<div id="goal-card" class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3"></div>

<div id="theme-card" class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3"></div>

<div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
    <h3 class="font-bold text-sm text-slate-900">Copia de seguridad</h3>
    <p class="text-xs text-slate-500">Guarda una copia para restaurarla después (o pasar tus datos a otro dispositivo).</p>
    <div class="flex gap-2 text-xs">
        <button onclick="exportData()" class="flex-1 bg-slate-800 text-white font-bold py-2.5 rounded-xl cursor-pointer">Exportar</button>
        <button onclick="document.getElementById('import-file').click()" class="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl cursor-pointer">Importar</button>
        <input type="file" id="import-file" accept="application/json" class="hidden" onchange="importData(this)">
    </div>
</div>

<div id="privacy-card" class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3"></div>
`
});
