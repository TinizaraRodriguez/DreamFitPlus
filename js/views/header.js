// Cabecera: título, estado de sincronización y botón de perfil.
Views.header = `
<header class="bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md">
    <div class="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
        <div>
            <h1 class="text-xl font-bold tracking-tight">Mi Plan Fitness</h1>
            <p class="text-xs text-emerald-100">Fuerza, Running & Nutrición</p>
            <p id="sync-badge" class="hidden text-[10px] text-emerald-100 mt-0.5"></p>
        </div>
        <button id="hdr-perfil" onclick="switchTab('perfil')" aria-label="Perfil y cuenta" class="w-10 h-10 rounded-full bg-emerald-500/40 border border-emerald-400/30 flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-emerald-500/60 transition">
            <i class="fa-solid fa-user"></i>
        </button>
    </div>
</header>
`;
