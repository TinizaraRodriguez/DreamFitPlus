// ===== CUENTAS =====
// Tres modos: 'supabase' (real, si config.js tiene las claves), 'demo' (solo pruebas locales, con ?demo en la
// dirección) y 'local' (sin cuentas, como hasta ahora).
const SB_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
const MIN_PASSWORD = 8;

function loadScript(src) {
    return new Promise((ok, fail) => {
        const s = document.createElement('script');
        s.src = src; s.onload = ok; s.onerror = () => fail(new Error('Failed to fetch ' + src));
        document.head.appendChild(s);
    });
}
const normEmail = e => String(e || '').trim().toLowerCase();
const appUrl = () => location.origin + location.pathname;
const mapUser = u => u ? { id: u.id, email: u.email, name: (u.user_metadata && u.user_metadata.name) || '' } : null;

const AUTH_ERRORS = [
    [/invalid login credentials|invalid_credentials/i, 'Email o contraseña incorrectos.'],
    [/email not confirmed|email_not_confirmed/i, 'Aún no has confirmado tu email. Revisa tu bandeja de entrada (y el spam).'],
    [/already registered|already been registered|user_already_exists/i, 'Ya existe una cuenta con ese email. Prueba a entrar.'],
    [/weak_password|password.*(short|least|characters)/i, `La contraseña es demasiado débil (mínimo ${MIN_PASSWORD} caracteres).`],
    [/same_password|different from the old|same password/i, 'La nueva contraseña debe ser distinta de la anterior.'],
    [/rate limit|too many|over_.*_rate_limit/i, 'Demasiados intentos. Espera unos minutos y vuelve a probar.'],
    [/signup.*disabled|signups not allowed/i, 'Ahora mismo no se permiten registros nuevos.'],
    [/invalid.*email|unable to validate email|email_address_invalid/i, 'El email no parece válido.'],
    [/failed to fetch|network|load failed/i, 'Sin conexión con el servidor. Comprueba tu internet e inténtalo de nuevo.'],
    [/DEMO:/, null]
];
function authMsg(err) {
    const m = `${(err && err.code) || ''} ${(err && (err.message || err.error_description)) || err || ''}`;
    const hit = AUTH_ERRORS.find(([re]) => re.test(m));
    if (hit) return hit[1] === null ? m.replace(/^.*DEMO:\s*/, '').trim() : hit[1];
    return 'Algo ha fallado. Inténtalo de nuevo.';
}

// ---------- Supabase ----------
const SupabaseBackend = {
    client: null,
    async init(cfg) {
        if (!window.supabase) await loadScript(SB_CDN);
        this.client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY,
            { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
        // El aviso de «recuperar contraseña» puede llegar un instante después de getSession
        this.client.auth.onAuthStateChange(event => { if (event === 'PASSWORD_RECOVERY') Auth.onRecovery(); });
        const { data, error } = await this.client.auth.getSession();
        if (error) throw error;
        return mapUser(data.session && data.session.user);
    },
    async signUp({ name, email, password }) {
        const { data, error } = await this.client.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: appUrl() } });
        if (error) throw error;
        // Con confirmación por email activada, un email ya registrado devuelve un usuario sin identidades (no un error)
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error('User already registered');
        return { user: mapUser(data.session && data.session.user), needsConfirm: !data.session };
    },
    async signIn({ email, password }) {
        const { data, error } = await this.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return mapUser(data.user);
    },
    async signOut() { const { error } = await this.client.auth.signOut({ scope: 'local' }); if (error) throw error; }, // solo este dispositivo
    async sendReset(email) {
        const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
        if (error) throw error;
        return { direct: false };
    },
    async setPassword(password) {
        const { data, error } = await this.client.auth.updateUser({ password });
        if (error) throw error;
        return mapUser(data.user);
    },
    async deleteAccount() { // requiere la función delete_my_account de supabase/01-auth.sql
        const { error } = await this.client.rpc('delete_my_account');
        if (error) throw error;
        await this.client.auth.signOut({ scope: 'local' }).catch(() => {});
    }
};

// ---------- Demostración (SOLO para probar la interfaz; no es seguro) ----------
const DemoBackend = {
    users() { try { return JSON.parse(localStorage.getItem('demoauth_users') || '{}'); } catch (e) { return {}; } },
    saveUsers(u) { localStorage.setItem('demoauth_users', JSON.stringify(u)); },
    async hash(email, pw) {
        const s = email + ':' + pw;
        if (window.crypto && crypto.subtle) {
            const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
            return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
        }
        return btoa(unescape(encodeURIComponent(s)));
    },
    pub(email) { const u = this.users()[email]; return u ? { id: u.id, email, name: u.name } : null; },
    async init() { return this.pub(localStorage.getItem('demoauth_session')); },
    async signUp({ name, email, password }) {
        const users = this.users();
        if (users[email]) throw new Error('User already registered');
        users[email] = { id: 'demo-' + Math.random().toString(36).slice(2, 10), name, hash: await this.hash(email, password) };
        this.saveUsers(users);
        localStorage.setItem('demoauth_session', email);
        return { user: this.pub(email), needsConfirm: false };
    },
    async signIn({ email, password }) {
        const u = this.users()[email];
        if (!u || u.hash !== await this.hash(email, password)) throw new Error('Invalid login credentials');
        localStorage.setItem('demoauth_session', email);
        return this.pub(email);
    },
    async signOut() { localStorage.removeItem('demoauth_session'); },
    async sendReset(email) {
        if (!this.users()[email]) throw new Error('DEMO: No existe ninguna cuenta demo con ese email.');
        localStorage.setItem('demoauth_reset', email);
        return { direct: true }; // en demo no se envía email: pasamos directamente a elegir la nueva contraseña
    },
    async setPassword(password) {
        const email = localStorage.getItem('demoauth_reset') || localStorage.getItem('demoauth_session');
        const users = this.users();
        if (!users[email]) throw new Error('DEMO: Sesión no válida.');
        users[email].hash = await this.hash(email, password);
        this.saveUsers(users);
        localStorage.removeItem('demoauth_reset');
        localStorage.setItem('demoauth_session', email);
        return this.pub(email);
    },
    async deleteAccount() {
        const email = localStorage.getItem('demoauth_session'), users = this.users();
        delete users[email]; this.saveUsers(users);
        localStorage.removeItem('demoauth_session');
    }
};

const Auth = {
    mode: 'local', user: null, recovery: false, booted: false, backend: null,
    async init() {
        const cfg = window.DREAMFIT_CONFIG || {};
        if (/[?&]demo=off\b/.test(location.search)) localStorage.removeItem('demoauth_on');
        else if (/[?&]demo\b/.test(location.search)) localStorage.setItem('demoauth_on', '1');
        if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) { this.mode = 'supabase'; this.backend = SupabaseBackend; }
        else if (localStorage.getItem('demoauth_on')) { this.mode = 'demo'; this.backend = DemoBackend; }
        else return;
        if (/type=recovery/.test(location.hash)) this.recovery = true;
        this.user = await this.backend.init(cfg);
    },
    onRecovery() { this.recovery = true; if (this.booted) AuthUI.show('recovery'); },
    signUp(d) { return this.backend.signUp(d); },
    signIn(d) { return this.backend.signIn(d); },
    signOut() { return this.backend.signOut(); },
    sendReset(e) { return this.backend.sendReset(e); },
    setPassword(p) { return this.backend.setPassword(p); },
    deleteAccount() { return this.backend.deleteAccount(); }
};

// ---------- Pantallas de entrar / registrarse ----------
const AuthUI = {
    busy: false,
    el: id => document.getElementById(id),
    show(view, o = {}) {
        this.busy = false; this.opts = o; this.view = view;
        const demo = Auth.mode === 'demo' ? '<p class="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 rounded-lg p-2"><b>MODO DEMOSTRACIÓN:</b> las cuentas se guardan solo en este navegador. No uses tu contraseña real.</p>' : '';
        const head = '<div class="text-center space-y-1"><div class="mx-auto w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xl"><i class="fa-solid fa-dumbbell"></i></div><h1 class="text-lg font-bold text-slate-900">Mi Plan Fitness</h1></div>';
        this.el('auth-overlay').classList.remove('hidden');
        this.el('auth-card').innerHTML = head + demo + (this.views[view] ? this.views[view].call(this, o) : '');
        const first = this.el('auth-card').querySelector('input:not([type=checkbox]), button.auth-primary');
        if (first && view !== 'loading') first.focus();
    },
    field(id, label, type, extra = '') {
        return `<div><label for="${id}" class="text-xs font-semibold text-slate-600">${label}</label><input id="${id}" name="${id}" type="${type}" ${extra} class="w-full mt-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"></div>`;
    },
    password(id, label, autocomplete, hint = '') {
        return `<div><label for="${id}" class="text-xs font-semibold text-slate-600">${label}</label>
            <div class="flex gap-1.5 mt-1"><input id="${id}" name="${id}" type="password" required minlength="${MIN_PASSWORD}" autocomplete="${autocomplete}" class="flex-1 min-w-0 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"><button type="button" aria-pressed="false" onclick="AuthUI.togglePw('${id}', this)" class="px-3 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl cursor-pointer">Mostrar</button></div>${hint}</div>`;
    },
    togglePw(id, btn) {
        const i = this.el(id), show = i.type === 'password';
        i.type = show ? 'text' : 'password'; btn.innerText = show ? 'Ocultar' : 'Mostrar'; btn.setAttribute('aria-pressed', show);
    },
    err: '<p id="auth-error" role="alert" class="text-xs text-red-600 min-h-[1rem]"></p>',
    primary: txt => `<button type="submit" class="auth-primary w-full bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm cursor-pointer hover:bg-emerald-700 disabled:opacity-50">${txt}</button>`,
    link: (fn, txt) => `<button type="button" onclick="${fn}" class="text-xs text-emerald-700 font-semibold underline cursor-pointer">${txt}</button>`,
    views: {
        loading() { return '<p class="text-center text-sm text-slate-500 py-6" role="status">Cargando…</p>'; },
        error(o) { return `<p role="alert" class="text-sm text-red-600 text-center">${escapeHtml(o.msg || 'Error')}</p><button onclick="location.reload()" class="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm cursor-pointer">Reintentar</button>`; },
        login() {
            return `<h2 class="font-bold text-base text-slate-900">Inicia sesión</h2>
            <form onsubmit="AuthUI.submit(event)" class="space-y-3" novalidate>
                ${this.field('email', 'Email', 'email', 'autocomplete="email" inputmode="email" required')}
                ${this.password('password', 'Contraseña', 'current-password')}
                ${this.err}${this.primary('Entrar')}
            </form>
            <div class="flex justify-between items-center">${this.link("AuthUI.show('forgot')", '¿Olvidaste tu contraseña?')}${this.link("AuthUI.show('register')", 'Crear cuenta')}</div>`;
        },
        register() {
            return `<h2 class="font-bold text-base text-slate-900">Crea tu cuenta</h2>
            <form onsubmit="AuthUI.submit(event)" class="space-y-3" novalidate>
                ${this.field('name', 'Nombre', 'text', 'autocomplete="given-name" maxlength="40" required')}
                ${this.field('email', 'Email', 'email', 'autocomplete="email" inputmode="email" required')}
                ${this.password('password', 'Contraseña', 'new-password', `<p class="text-[11px] text-slate-500 mt-1">Mínimo ${MIN_PASSWORD} caracteres.</p>`)}
                <label class="flex items-start gap-2 text-[11px] text-slate-600"><input type="checkbox" id="consent" name="consent" class="mt-0.5 w-4 h-4"><span>Acepto que mis datos de entreno, comidas y medidas se guarden en la nube de esta app. Puedo borrarlos cuando quiera desde Progreso → Cuenta.</span></label>
                ${this.err}${this.primary('Crear cuenta')}
            </form>
            <div class="text-center">${this.link("AuthUI.show('login')", '¿Ya tienes cuenta? Entrar')}</div>`;
        },
        forgot() {
            return `<h2 class="font-bold text-base text-slate-900">Recuperar contraseña</h2>
            <p class="text-xs text-slate-600">Escribe tu email y te enviaremos un enlace para elegir una nueva.</p>
            <form onsubmit="AuthUI.submit(event)" class="space-y-3" novalidate>
                ${this.field('email', 'Email', 'email', 'autocomplete="email" inputmode="email" required')}
                ${this.err}${this.primary('Enviar enlace')}
            </form>
            <div class="text-center">${this.link("AuthUI.show('login')", 'Volver a entrar')}</div>`;
        },
        'check-email'(o) {
            return `<div class="text-center space-y-2"><p class="text-3xl">✉️</p><h2 class="font-bold text-base text-slate-900">Revisa tu correo</h2>
            <p class="text-xs text-slate-600">${o.reset ? 'Si existe una cuenta con' : 'Te hemos enviado un enlace de confirmación a'} <b>${escapeHtml(o.email)}</b>${o.reset ? ', te llegará un enlace para cambiar la contraseña.' : '. Ábrelo desde este dispositivo para activar tu cuenta.'} Mira también en spam.</p></div>
            <button onclick="AuthUI.show('login')" class="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm cursor-pointer">Volver a entrar</button>`;
        },
        recovery() {
            return `<h2 class="font-bold text-base text-slate-900">Elige una nueva contraseña</h2>
            <form onsubmit="AuthUI.submit(event)" class="space-y-3" novalidate>
                ${this.password('password', 'Nueva contraseña', 'new-password', `<p class="text-[11px] text-slate-500 mt-1">Mínimo ${MIN_PASSWORD} caracteres.</p>`)}
                ${this.err}${this.primary('Guardar contraseña')}
            </form>`;
        },
        import() {
            return `<h2 class="font-bold text-base text-slate-900">Datos en este dispositivo</h2>
            <p class="text-xs text-slate-600">Hay entrenos, medidas y recetas guardados en este dispositivo de antes de tener cuenta. ¿Quieres pasarlos a tu cuenta${Auth.user.name ? ', ' + escapeHtml(Auth.user.name) : ''}?</p>
            <button onclick="AuthUI.importGuest(true)" class="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm cursor-pointer">Sí, importarlos</button>
            <button onclick="AuthUI.importGuest(false)" class="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-sm cursor-pointer">No, empezar de cero</button>`;
        }
    },
    setError(msg) { const e = this.el('auth-error'); if (e) e.innerText = msg; },
    setBusy(b) {
        this.busy = b;
        const btn = this.el('auth-card').querySelector('button.auth-primary');
        if (btn) { btn.disabled = b; btn.dataset.t = btn.dataset.t || btn.innerText; btn.innerText = b ? 'Un momento…' : btn.dataset.t; }
    },
    async submit(e) {
        e.preventDefault();
        if (this.busy) return;
        const f = e.target.elements, v = n => (f[n] ? f[n].value : ''), view = this.view;
        const email = normEmail(v('email')), password = v('password'), name = v('name').trim();
        this.setError('');
        if (view !== 'recovery' && !/^\S+@\S+\.\S+$/.test(email)) return this.setError('Escribe un email válido.');
        if ((view === 'register' || view === 'recovery') && password.length < MIN_PASSWORD) return this.setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
        if (view === 'login' && !password) return this.setError('Escribe tu contraseña.');
        if (view === 'register' && !name) return this.setError('Escribe tu nombre.');
        if (view === 'register' && !f.consent.checked) return this.setError('Necesitas aceptar el guardado de datos para crear la cuenta.');
        this.setBusy(true);
        try {
            if (view === 'login') { Auth.user = await Auth.signIn({ email, password }); await afterLogin(); }
            else if (view === 'register') {
                const r = await Auth.signUp({ name, email, password });
                if (r.needsConfirm) return this.show('check-email', { email });
                Auth.user = r.user; await afterLogin();
            } else if (view === 'forgot') {
                const r = await Auth.sendReset(email);
                if (r.direct) { Auth.recovery = true; return this.show('recovery'); }
                this.show('check-email', { email, reset: true });
            } else if (view === 'recovery') {
                Auth.user = await Auth.setPassword(password); Auth.recovery = false;
                history.replaceState(null, '', location.pathname + location.search); // quita el código de la dirección
                await afterLogin();
            }
        } catch (err) { this.setBusy(false); this.setError(authMsg(err)); }
    },
    importGuest(yes) {
        if (yes) { const n = DB.adoptGuestData(); if (Sync.enabled) Sync.markAll(); showToast(n ? 'Datos importados a tu cuenta ✓' : 'No había datos que importar'); }
        DB.setItem('dreamfit_import_done', '1');
        startApp();
    }
};

// ---------- Tarjeta «Cuenta» (Progreso) ----------
function updateHeaderAvatar() {
    const b = document.getElementById('hdr-perfil');
    if (!b) return;
    const n = Auth.user && (Auth.user.name || Auth.user.email);
    b.innerHTML = n ? escapeHtml(n.trim().charAt(0).toUpperCase()) : '<i class="fa-solid fa-user"></i>';
}
function renderAccount() {
    updateHeaderAvatar();
    const box = document.getElementById('account-card');
    if (!box) return;
    if (!Auth.user) {
        box.innerHTML = '<h3 class="font-bold text-sm text-slate-900">Cuenta</h3><p class="text-xs text-slate-500">Modo local: tus datos solo están en este dispositivo y no se sincronizan.</p>';
        return;
    }
    const u = Auth.user, ini = escapeHtml((u.name || u.email || '?').charAt(0).toUpperCase());
    box.innerHTML = `<h3 class="font-bold text-sm text-slate-900">Cuenta</h3>
        <div class="flex items-center gap-3"><div class="w-10 h-10 shrink-0 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center">${ini}</div><div class="min-w-0"><p class="font-bold text-sm text-slate-900 truncate">${escapeHtml(u.name || 'Sin nombre')}</p><p class="text-xs text-slate-500 truncate">${escapeHtml(u.email)}</p></div></div>
        ${Auth.mode === 'demo' ? '<p class="text-[11px] bg-amber-50 text-amber-800 rounded-lg p-2">Cuenta de demostración (solo en este navegador).</p>' : ''}
        ${Sync.enabled ? '<div class="flex items-center justify-between gap-2"><p id="sync-status" role="status" class="text-[11px] text-slate-500"></p><button onclick="syncNowUI()" class="text-[11px] text-emerald-700 font-semibold underline cursor-pointer whitespace-nowrap">Sincronizar ahora</button></div>' : ''}
        <div class="flex gap-2 text-xs"><button onclick="logout()" class="flex-1 bg-slate-800 text-white font-bold py-2.5 rounded-xl cursor-pointer">Cerrar sesión</button><button onclick="togglePwForm()" class="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl cursor-pointer">Cambiar contraseña</button></div>
        <form id="pw-form" onsubmit="changePassword(event)" class="hidden space-y-2" novalidate>
            <label for="pw-new" class="text-xs font-semibold text-slate-600">Nueva contraseña (mínimo ${MIN_PASSWORD})</label>
            <input id="pw-new" type="password" autocomplete="new-password" minlength="${MIN_PASSWORD}" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <p id="pw-error" role="alert" class="text-xs text-red-600"></p>
            <button type="submit" class="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer">Guardar contraseña</button>
        </form>
        <button onclick="deleteAccount()" class="text-[11px] text-red-600 underline cursor-pointer">Eliminar mi cuenta y mis datos</button>`;
    if (Sync.enabled) updateSyncStatus();
}
async function syncNowUI() {
    const r = await Sync.syncNow();
    if (r.failed) return; // el estado ya muestra el motivo
    if (r.changed) refreshFromRemote();
    showToast('Sincronizado ✓');
}
function togglePwForm() { const f = document.getElementById('pw-form'); f.classList.toggle('hidden'); if (!f.classList.contains('hidden')) document.getElementById('pw-new').focus(); }
async function changePassword(e) {
    e.preventDefault();
    const pw = document.getElementById('pw-new').value, err = document.getElementById('pw-error');
    if (pw.length < MIN_PASSWORD) { err.innerText = `Mínimo ${MIN_PASSWORD} caracteres.`; return; }
    try { await Auth.setPassword(pw); err.innerText = ''; document.getElementById('pw-new').value = ''; document.getElementById('pw-form').classList.add('hidden'); showToast('Contraseña cambiada ✓'); }
    catch (x) { err.innerText = authMsg(x); }
}
async function logout() {
    if (Sync.enabled) {
        await Sync.flush(); // intenta enviar lo pendiente antes de salir
        if (Sync.hasPending() && !confirm('Hay cambios que aún no se han enviado a la nube (¿sin conexión?). Si cierras sesión ahora se perderán.\n\n¿Cerrar sesión igualmente?')) return;
    }
    try { await Auth.signOut(); } catch (x) { showToast(authMsg(x)); return; }
    if (Sync.enabled) { Sync.stop(); DB.clearScope(); Sync.clearMeta(); } // los datos están en la nube; no dejamos copia en un dispositivo compartido
    location.reload();
}
async function deleteAccount() {
    const t = prompt('Esto borrará tu cuenta y todos tus datos de forma permanente.\nEscribe ELIMINAR para confirmar:');
    if (t !== 'ELIMINAR') return;
    try { await Auth.deleteAccount(); } catch (x) { showToast('No se pudo eliminar la cuenta. Inténtalo de nuevo.'); return; }
    if (Sync.enabled) { Sync.stop(); Sync.clearMeta(); }
    DB.clearScope();
    location.reload();
}
