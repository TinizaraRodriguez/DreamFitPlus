// ===== TEMA CLARO / OSCURO =====
// Se carga en <head> para aplicar el tema ANTES de pintar (sin parpadeo). La preferencia es del dispositivo
// (no se sincroniza con la nube): 'auto' sigue al sistema, 'light' o 'dark' la fijan.
const THEME_KEY = 'dfx_theme';
const THEMES = { auto: ['Sistema', 'fa-circle-half-stroke'], light: ['Claro', 'fa-sun'], dark: ['Oscuro', 'fa-moon'] };
function getThemePref() { try { const v = localStorage.getItem(THEME_KEY); return THEMES[v] ? v : 'auto'; } catch (e) { return 'auto'; } }
function themeIsDark(pref = getThemePref()) {
    return pref === 'dark' || (pref === 'auto' && !!window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
}
function applyTheme() {
    const dark = themeIsDark();
    document.documentElement.classList.toggle('dark', dark);
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', dark ? '#064e3b' : '#059669');
    return dark;
}
function setTheme(pref) {
    try { localStorage.setItem(THEME_KEY, pref); } catch (e) { /* sin almacenamiento: se aplica solo en esta sesión */ }
    applyTheme(); renderThemeCard();
    if (typeof renderProgress === 'function') renderProgress(); // las gráficas usan colores propios
}
function renderThemeCard() {
    const el = document.getElementById('theme-card'); if (!el) return;
    const cur = getThemePref();
    el.innerHTML = `<h3 class="font-bold text-sm text-slate-900 flex items-center gap-2"><i class="fa-solid fa-palette text-emerald-600" aria-hidden="true"></i> Apariencia</h3>
        <div role="group" aria-label="Tema" class="grid grid-cols-3 gap-2 text-xs">${Object.entries(THEMES).map(([k, [l, ic]]) =>
            `<button onclick="setTheme('${k}')" aria-pressed="${cur === k}" class="py-2.5 rounded-xl font-bold cursor-pointer flex flex-col items-center gap-1 ${cur === k ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}"><i class="fa-solid ${ic}" aria-hidden="true"></i>${l}</button>`).join('')}</div>
        <p class="text-[11px] text-slate-500">«Sistema» sigue el modo claro u oscuro de tu móvil u ordenador. Se guarda solo en este dispositivo.</p>`;
}
applyTheme();
if (window.matchMedia) { try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (getThemePref() === 'auto') { applyTheme(); renderThemeCard(); if (typeof renderProgress === 'function') renderProgress(); } }); } catch (e) { /* navegador antiguo */ } }
