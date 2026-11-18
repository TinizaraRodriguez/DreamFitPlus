let waterLevel = 0;
const TABS = Views.tabIds();
let lastTab = 'hoy';
const MEAL_IDS = { morn: 'meal-morn', lunch: 'meal-lunch', snack: 'meal-snack', dinner: 'meal-dinner' };

function switchTab(tabName) {
    if (tabName !== 'perfil') lastTab = tabName;
    TABS.forEach(t => {
        const active = t === tabName;
        document.getElementById('tab-' + t).style.display = active ? 'block' : 'none';
        const btn = document.getElementById('nav-' + t);
        if (!btn) return; // el perfil no está en la barra inferior
        btn.classList.toggle('text-emerald-600', active);
        btn.classList.toggle('font-bold', active);
        btn.classList.toggle('text-slate-500', !active);
        if (active) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
    });
    if (tabName === 'hoy') renderToday();
    if (tabName === 'entreno') renderEntrenoTab();
    if (tabName === 'progreso') renderProgress();
    if (tabName === 'perfil') { renderAccount(); renderGoalCard(); renderThemeCard(); renderPrivacyCard(); }
    const hp = document.getElementById('hdr-perfil');
    if (hp) { if (tabName === 'perfil') hp.setAttribute('aria-current', 'page'); else hp.removeAttribute('aria-current'); }
    window.scrollTo(0, 0);
}

function closeProfile() { switchTab(lastTab); }

function setWaterUI(num) {
    waterLevel = num;
    const N = waterGoal();
    for (let i = 1; i <= N; i++) {
        const btn = document.getElementById('w-' + i);
        if (!btn) continue;
        btn.classList.toggle('bg-blue-500', i <= num);
        btn.classList.toggle('text-white', i <= num);
        btn.classList.toggle('bg-blue-50/50', i > num);
        btn.classList.toggle('text-slate-500', i > num);
    }
    document.getElementById('water-count').innerText = waterLevel + ' / ' + N + ' vasos';
}

function toggleWater(num) {
    setWaterUI(num === waterLevel ? num - 1 : num); // pulsar el nivel actual lo quita
    saveState();
}

function sendToMeal(mealType, text, nut) {
    const el = document.getElementById(MEAL_IDS[mealType]);
    if (el) el.value = text;
    const n = nut && cleanNut(nut); if (n) mealNut[mealType] = n; else delete mealNut[mealType];
    saveState();
    switchTab('hoy');
}

function saveState() {
    const state = { date: getTodayKey(), water: waterLevel };
    Object.entries(MEAL_IDS).forEach(([k, id]) => state[k] = document.getElementById(id).value);
    state.nut = mealNut;
    DB.setItem('dreamfit_state', JSON.stringify(state));
    const tot = nutTotals();
    setDayStat(getTodayKey(), { water: waterLevel, meals: mealsCount(), kcal: tot.kcal, protein: tot.protein, nutMeals: tot.logged });
    renderTodayLive();
}

function loadState() {
    renderWaterCard(); renderNutriCard();
    const state = safeParse('dreamfit_state', null);
    mealNut = {};
    // Solo se restaura el estado si es de hoy: cada día empieza limpio
    if (state && state.date === getTodayKey()) {
        setWaterUI(state.water || 0); // sin guardar: así no se pisan las comidas
        mealNut = state.nut && typeof state.nut === 'object' ? state.nut : {};
        Object.entries(MEAL_IDS).forEach(([k, id]) => { document.getElementById(id).value = state[k] || ''; });
    }
    renderAllSelects();
    renderAgenda();
    renderMonthlyCalendar();
    renderRecipesCatalog(); renderMenuCard(); renderShopCard(); setRecSection(recSection, false);
    loadHistory();
    updateTodayBadge();
}

async function resetDay() {
    const yes = await UI.confirm({ title: '¿Empezar un nuevo día?', message: 'Se vaciarán el agua, las comidas y la marca de entreno de hoy.', confirmText: 'Empezar de cero', tone: 'warn', icon: 'fa-rotate-right' });
    if (yes) {
        DB.removeItem('dreamfit_state');
        mealNut = {};
        setWaterUI(0);
        Object.values(MEAL_IDS).forEach(id => document.getElementById(id).value = '');
        setDayCompleted(getTodayKey(), false);
        setDayStat(getTodayKey(), { water: 0, meals: 0, kcal: 0, protein: 0, nutMeals: 0 });
        updateTodayBadge();
        renderAgenda();
        renderMonthlyCalendar();
    }
}

// ---------- Arranque: primero cuentas, luego la app ----------
let appStarted = false;
function startApp() {
    if (appStarted) return;
    appStarted = true;
    document.getElementById('auth-overlay').classList.add('hidden');
    renderMealsCard();
    loadState();
    renderAccount();
    if (!profileDone()) openOnboarding(true); // primera vez: pregunta el objetivo
    if (Sync.enabled) { // volver a la app / recuperar conexión: enviar lo pendiente y traer lo nuevo de otros dispositivos
        const pull = () => Sync.pull().then(r => { if (r.changed) refreshFromRemote(); });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) Sync.flush(); else if (Date.now() - Sync.lastPullAt > 30000) pull();
        });
        window.addEventListener('online', () => { Sync.flush(); pull(); });
        setInterval(updateSyncStatus, 30000);
    }
    // otra pestaña/ventana cambió datos de la app (ignora lo que no es nuestro, como la sesión)
    window.addEventListener('storage', e => { if (!e.key || e.key.startsWith('dreamfit_')) loadState(); });
}

function refreshFromRemote() { // llegaron datos nuevos de otro dispositivo
    if (ob && ob.first && profileDone()) closeOnboarding(); // en la nube ya había un perfil: no hace falta preguntar
    loadState(); renderGoalCard();
} // llegaron datos nuevos de otro dispositivo

async function afterLogin() { // ya hay sesión: elegir su espacio de datos, traer lo de la nube y arrancar
    DB.setScope(Auth.user.id);
    if (Auth.mode === 'supabase') {
        AuthUI.show('loading');
        Sync.start(SupabaseBackend.client, Auth.user.id);
        const p = Sync.pull();
        // Dispositivo conocido (ya hay datos locales): se arranca al instante con la copia local y lo de la nube se mezcla al llegar.
        // Dispositivo nuevo: se espera a la nube (máx. 4 s) para no enseñar un plan vacío.
        const known = DB.getItem('dreamfit_profile') !== null;
        const first = known ? null : await Promise.race([p, new Promise(r => setTimeout(() => r(null), 4000))]);
        if (first === null) p.then(r => {
            if (r.changed && appStarted) refreshFromRemote();
            if (AuthUI.view === 'consent' && consentOk()) startAfterConsent(); // el consentimiento ya estaba dado en otro dispositivo
        });
    }
    if (AuthUI.consentGiven) { recordConsent(); AuthUI.consentGiven = false; } // lo aceptó marcando la casilla al registrarse
    if (!consentOk()) return AuthUI.show('consent'); // cuentas nuevas de Google y cuentas anteriores a la política
    startAfterConsent();
}
function startAfterConsent() {
    const hasOld = DB.guestKeys().length > 0 && !DB.getItem('dreamfit_import_done');
    if (hasOld) AuthUI.show('import'); else startApp();
}

async function boot() {
    Views.mount(); // pinta pestañas, cabecera, barra y hojas antes de cualquier otra cosa
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.getElementById('ui-dialog')) { if (privacyOpen()) { closePrivacy(); return; } closeSosModal(); closeMealModal(); if (ob) skipOnboarding(); else if (wk) wkExit(); } });
    try { await Auth.init(); }
    catch (e) { AuthUI.show('error', { msg: 'No se pudo conectar con el servicio de cuentas. ' + authMsg(e) }); return; }
    Auth.booted = true;
    if (Auth.mode === 'local') return startApp();
    if (Auth.recovery) return AuthUI.show('recovery');
    if (!Auth.user) return AuthUI.show('login');
    afterLogin();
}
document.addEventListener('DOMContentLoaded', boot);
