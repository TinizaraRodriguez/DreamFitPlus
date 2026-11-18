// ===== SINCRONIZACIÓN CON LA NUBE (Supabase) =====
// El móvil guarda siempre una copia local (funciona sin conexión). Cada cambio se marca como "pendiente"
// y se envía a la tabla user_data. Al abrir la app y al volver a ella se descargan los cambios de otros dispositivos.
// Regla de conflicto: si una clave tiene cambios locales sin enviar, gana lo local; si no, gana lo de la nube.
const SYNC_KEY_RE = /^dreamfit_[a-z0-9_]+$/;
const isNetErr = e => (typeof navigator !== 'undefined' && navigator.onLine === false) || e instanceof TypeError || /failed to fetch|network|load failed/i.test((e && e.message) || '');

function syncMsg(e) {
    const m = `${(e && e.code) || ''} ${(e && e.message) || ''}`;
    if (/42501|row-level security|permission denied/i.test(m)) return 'Permisos de la base de datos incorrectos (revisa supabase/02-datos.sql).';
    if (/PGRST205|42P01|schema cache|does not exist/i.test(m)) return 'La base de datos aún no está preparada (falta ejecutar supabase/02-datos.sql).';
    if (/jwt|401|expired/i.test(m)) return 'Tu sesión ha caducado: cierra sesión y vuelve a entrar.';
    return 'No se pudo sincronizar.';
}

const Sync = {
    enabled: false, client: null, uid: null, dirty: {}, timer: null, flushing: false, pullP: null,
    state: 'off', err: null, lastSync: 0, lastPullAt: 0, retries: 0,
    _mk() { return 'dreamfitsync_' + this.uid; }, // fuera del prefijo dreamfit_: no se sincroniza ni se exporta
    _save() { localStorage.setItem(this._mk(), JSON.stringify({ dirty: this.dirty })); },
    start(client, uid) {
        this.client = client; this.uid = uid; this.enabled = true; this.retries = 0;
        try { this.dirty = JSON.parse(localStorage.getItem(this._mk()) || '{}').dirty || {}; } catch (e) { this.dirty = {}; }
        this.setState(this.hasPending() ? 'pending' : 'idle');
    },
    stop() { this.enabled = false; clearTimeout(this.timer); },
    clearMeta() { if (this.uid) localStorage.removeItem(this._mk()); this.dirty = {}; },
    hasPending() { return Object.keys(this.dirty).length > 0; },
    setState(s, err) { this.state = s; this.err = err || null; if (typeof updateSyncStatus === 'function') updateSyncStatus(); },

    mark(key) { // lo llama DB.setItem / DB.removeItem
        if (!this.enabled || !SYNC_KEY_RE.test(key)) return;
        this.dirty[key] = 1; this._save(); this.setState('pending'); this.schedule(1000);
    },
    markAll() { DB.keys().forEach(k => { this.dirty[k] = 1; }); this._save(); this.setState('pending'); this.schedule(300); },
    schedule(ms) { if (!this.enabled) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.flush(), ms); },
    _fail(e) {
        this.retries++;
        this.setState(isNetErr(e) ? 'offline' : 'error', e);
        const wait = Math.min(300000, 15000 * 2 ** (this.retries - 1)); // 15 s, 30 s, 1 min… hasta 5 min
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.hasPending() ? this.flush() : this.pull().then(r => { if (r.changed && typeof refreshFromRemote === 'function') refreshFromRemote(); }), wait);
    },

    async flush() { // envía lo pendiente. Si ya hay un envío en curso espera a que acabe y, si quedó algo, lo envía también (máx. 3 vueltas)
        if (!this.enabled) return;
        for (let round = 0; round < 3; round++) {
            if (!this.flushP) {
                if (!this.hasPending()) return;
                this.flushP = this._flush().finally(() => { this.flushP = null; });
            }
            await this.flushP;
            if (!this.hasPending() || this.retries > 0) return; // todo enviado, o falló (se reintentará solo)
        }
    },
    async _flush() {
        this.flushing = true; clearTimeout(this.timer);
        const snap = {}; Object.keys(this.dirty).forEach(k => { snap[k] = DB.getItem(k); });
        try {
            this.setState('syncing');
            const rows = Object.keys(snap).map(k => ({ user_id: this.uid, key: k, value: snap[k] })); // value null = borrada
            const { error } = await this.client.from('user_data').upsert(rows, { onConflict: 'user_id,key' });
            if (error) throw error;
            Object.keys(snap).forEach(k => { if (DB.getItem(k) === snap[k]) delete this.dirty[k]; }); // si cambió mientras tanto, sigue pendiente
            this._save(); this.retries = 0; this.lastSync = Date.now();
            this.setState(this.hasPending() ? 'pending' : 'ok');
            if (this.hasPending()) this.schedule(300);
        } catch (e) { this._fail(e); }
        finally { this.flushing = false; }
    },

    pull() {
        if (!this.enabled) return Promise.resolve({ changed: false });
        if (!this.pullP) this.pullP = this._pull().finally(() => { this.pullP = null; });
        return this.pullP;
    },
    async _pull() { // descarga lo de la nube y lo mezcla con lo local
        this.setState('syncing');
        let rows;
        try {
            const r = await this.client.from('user_data').select('key,value');
            if (r.error) throw r.error;
            rows = (r.data || []).filter(x => SYNC_KEY_RE.test(x.key));
        } catch (e) { this._fail(e); return { changed: false, failed: true }; }
        let changed = false;
        const remote = new Set();
        rows.forEach(({ key, value }) => {
            remote.add(key);
            if (this.dirty[key]) return; // cambios locales sin enviar: ganan
            const lk = DB._k(key), cur = localStorage.getItem(lk);
            if (value === null) { if (cur !== null) { localStorage.removeItem(lk); changed = true; } }
            else if (cur !== value) { localStorage.setItem(lk, value); changed = true; }
        });
        DB.keys().forEach(k => { if (!remote.has(k) && SYNC_KEY_RE.test(k)) this.dirty[k] = 1; }); // lo que solo existe aquí, se sube
        this._save(); this.lastPullAt = Date.now(); this.retries = 0;
        if (this.hasPending()) await this.flush(); else { this.lastSync = Date.now(); this.setState('ok'); }
        return { changed };
    },
    async syncNow() { await this.flush(); return this.pull(); }
};

const agoTxt = ms => { const m = Math.floor((Date.now() - ms) / 60000); return m < 1 ? 'ahora mismo' : m === 1 ? 'hace 1 min' : m < 60 ? `hace ${m} min` : 'hace más de 1 h'; };
function updateSyncStatus() {
    const s = Sync.state, el = document.getElementById('sync-status'), badge = document.getElementById('sync-badge');
    const full = { off: '', idle: '☁️ Conectado', syncing: '☁️ Sincronizando…', pending: '☁️ Cambios por enviar…', ok: '☁️ Sincronizado ' + agoTxt(Sync.lastSync), offline: '☁️ Sin conexión: se enviará al volver', error: '⚠️ ' + syncMsg(Sync.err) }[s];
    const short = { off: '', idle: '☁️ Conectado', syncing: '☁️ Sincronizando…', pending: '☁️ Pendiente', ok: '☁️ Sincronizado', offline: '☁️ Sin conexión', error: '⚠️ Error de sincronización' }[s];
    if (el) { el.innerText = full; el.className = 'text-[11px] ' + (s === 'error' ? 'text-red-600' : s === 'offline' ? 'text-amber-700' : 'text-slate-500'); }
    if (badge) { badge.classList.toggle('hidden', !Sync.enabled); badge.innerText = short; }
}
