// Pantalla de acceso: el contenido lo pinta AuthUI (js/auth.js).
Views.addModal('auth', `
<div id="auth-overlay" class="fixed inset-0 z-[70] bg-gradient-to-br from-emerald-600 to-teal-700 overflow-y-auto">
    <div class="min-h-full flex items-center justify-center p-4">
        <div id="auth-card" class="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4"><p class="text-center text-sm text-slate-500 py-6" role="status">Cargando…</p></div>
    </div>
</div>
`);
