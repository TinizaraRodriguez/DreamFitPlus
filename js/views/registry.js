// Registro de vistas. Cada pestaña y cada hoja modal vive en su propio archivo
// dentro de js/views/ y se registra aquí. index.html solo carga scripts.
//
// Para añadir una pestaña nueva:
//   1. Crea js/views/tabs/<id>.js con Views.addTab({ id, label, icon, nav, html })
//   2. Añade su <script> en index.html (antes de js/app.js) y su lógica en js/<id>.js
//   3. Si necesita pintarse al abrirse, añade una línea en switchTab (js/app.js)
const Views = {
    tabs: [],
    modals: [],
    header: '',
    addTab(tab) { this.tabs.push(tab); },
    addModal(name, html) { this.modals.push({ name, html }); },
    tabIds() { return this.tabs.map(t => t.id); },

    navHtml() {
        const items = this.tabs.filter(t => t.nav).map((t, i) => {
            const cls = i === 0 ? 'text-emerald-600 font-bold' : 'hover:text-emerald-600';
            return `<button onclick="switchTab('${t.id}')" id="nav-${t.id}" class="flex flex-col items-center ${cls} py-1 px-2 cursor-pointer">
                <i class="fa-solid ${t.icon} text-base mb-1"></i> ${t.label}
            </button>`;
        }).join('\n');
        return `<nav aria-label="Navegación principal" class="fixed bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom)] bg-white border-t border-slate-200 shadow-lg z-50">
            <div class="max-w-md mx-auto flex justify-around py-2 text-[11px] font-medium text-slate-500">${items}</div>
        </nav>`;
    },

    // Pinta todo en los huecos de index.html. Se llama una sola vez, antes de arrancar la app.
    mount() {
        const put = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
        put('app-header', this.header);
        put('app-main', this.tabs.map((t, i) =>
            `<section id="tab-${t.id}" class="space-y-5"${i === 0 ? '' : ' style="display: none;"'}>${t.html}</section>`).join('\n'));
        put('app-nav', this.navHtml());
        put('app-modals', this.modals.map(m => m.html).join('\n'));
    }
};
