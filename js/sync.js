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
    enabled: false, client: null, uid: null, dirty: {}, base: {}, legacy: {}, recMode: null, timer: null, flushing: false, pullP: null,
    state: 'off', err: null, lastSync: 0, lastPullAt: 0, retries: 0,
    _mk() { return 'dreamfitsync_' + this.uid; }, // fuera del prefijo dreamfit_: no se sincroniza ni se exporta
    _save() { localStorage.setItem(this._mk(), JSON.stringify({ dirty: this.dirty, base: this.base })); },
    start(client, uid) {
        this.client = client; this.uid = uid; this.enabled = true; this.retries = 0;
        try { const m = JSON.parse(localStorage.getItem(this._mk()) || '{}'); this.dirty = m.dirty || {}; this.base = m.base || {}; } catch (e) { this.dirty = {}; this.base = {}; }
        this.recMode = null;
        this.setState(this.hasPending() ? 'pending' : 'idle');
    },
    stop() { this.enabled = false; clearTimeout(this.timer); },
    clearMeta() { if (this.uid) localStorage.removeItem(this._mk()); this.dirty = {}; this.base = {}; },
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
            const recKeys = Object.keys(snap).filter(k => this.recMode === true && isRecordKey(k)), blobKeys = Object.keys(snap).filter(k => !recKeys.includes(k));
            if (blobKeys.length) {
                const rows = blobKeys.map(k => ({ user_id: this.uid, key: k, value: snap[k] })); // value null = borrada
                const { error } = await this.client.from('user_data').upsert(rows, { onConflict: 'user_id,key' });
                if (error) throw error;
            }
            await Promise.all(recKeys.map(k => this._flushRecords(k, snap[k]))); // los tipos de dato en paralelo
            Object.keys(snap).forEach(k => { if (DB.getItem(k) === snap[k]) delete this.dirty[k]; }); // si cambió mientras tanto, sigue pendiente
            this._save(); this.retries = 0; this.lastSync = Date.now();
            this.setState(this.hasPending() ? 'pending' : 'ok');
            if (this.hasPending()) this.schedule(300);
        } catch (e) { this._fail(e); }
        finally { this.flushing = false; }
    },
    async _flushRecords(key, raw) { // solo los registros nuevos, cambiados o borrados (una fila cada uno)
        const L = toRecords(key, raw), first = !!this.legacy[key], base = this.base[key] || {}, kind = recKind(key), { up, del } = diffRecords(L, base);
        for (let i = 0; i < up.length; i += 400) {
            const rows = up.slice(i, i + 400).map(rid => ({ user_id: this.uid, kind, rid, date: L[rid].date, data: L[rid].data }));
            const { error } = await this.client.from('records').upsert(rows, { onConflict: 'user_id,kind,rid' });
            if (error) throw error;
        }
        for (let i = 0; i < del.length; i += 100) {
            const { error } = await this.client.from('records').delete().eq('user_id', this.uid).eq('kind', kind).in('rid', del.slice(i, i + 100));
            if (error) throw error;
        }
        const nb = {}; Object.entries(L).forEach(([rid, r]) => { nb[rid] = recHash(r); });
        this.base[key] = nb;
        if (first) { try { const r = await this.client.from('user_data').delete().eq('user_id', this.uid).eq('key', key); if (!r.error) delete this.legacy[key]; } catch (e) { /* el JSON antiguo ya no hace falta; si falla no pasa nada */ } }
    },

    pull() {
        if (!this.enabled) return Promise.resolve({ changed: false });
        if (!this.pullP) this.pullP = this._pull().finally(() => { this.pullP = null; });
        return this.pullP;
    },
    async _pull() { // descarga lo de la nube y lo mezcla con lo local
        this.setState('syncing');
        let rows, recs = null;
        const fetchRecs = async () => { // tabla de registros (si aún no se ha ejecutado 05-registros.sql, todo sigue funcionando como antes)
            const all = [];
            for (let from = 0; ; from += 1000) {
                const r = await this.client.from('records').select('kind,rid,date,data').order('kind').order('rid').range(from, from + 999);
                if (r.error) throw r.error;
                all.push(...(r.data || []));
                if ((r.data || []).length < 1000) break;
            }
            return all;
        };
        let ur, rr;
        try {
            [ur, rr] = await Promise.all([ // las dos peticiones a la vez
                this.client.from('user_data').select('key,value').then(r => ({ r }), e => ({ e })),
                fetchRecs().then(v => ({ v }), e => ({ e }))
            ]);
        } catch (e) { this._fail(e); return { changed: false, failed: true }; }
        if (ur.e || ur.r.error) { this._fail(ur.e || ur.r.error); return { changed: false, failed: true }; }
        rows = (ur.r.data || []).filter(x => SYNC_KEY_RE.test(x.key));
        if (rr.e) {
            if (/PGRST205|42P01|schema cache|does not exist/i.test(`${rr.e.code} ${rr.e.message}`)) this.recMode = false;
            else { this._fail(rr.e); return { changed: false, failed: true }; }
        } else { recs = rr.v; this.recMode = true; }
        let changed = false;
        const remote = new Set(), blobs = {};
        rows.forEach(({ key, value }) => {
            remote.add(key); blobs[key] = value;
            if (this.recMode === true && isRecordKey(key)) return; // esos datos viven en «records»
            if (this.dirty[key]) return; // cambios locales sin enviar: ganan
            const lk = DB._k(key), cur = localStorage.getItem(lk);
            if (value === null) { if (cur !== null) { localStorage.removeItem(lk); changed = true; } }
            else if (cur !== value) { localStorage.setItem(lk, value); changed = true; }
        });
        if (this.recMode === true) changed = this._mergeRecords(recs, blobs) || changed;
        DB.keys().forEach(k => { if (!remote.has(k) && SYNC_KEY_RE.test(k) && !(this.recMode === true && isRecordKey(k))) this.dirty[k] = 1; }); // lo que solo existe aquí, se sube
        this._save(); this.lastPullAt = Date.now(); this.retries = 0;
        if (this.hasPending()) await this.flush(); else { this.lastSync = Date.now(); this.setState('ok'); }
        return { changed };
    },
    _mergeRecords(recs, blobs) { // mezcla por registro: lo no tocado aquí se actualiza desde la nube; lo tocado aquí gana
        let changed = false;
        const byKind = {}; recs.forEach(r => { (byKind[r.kind] = byKind[r.kind] || {})[r.rid] = { date: r.date, data: r.data }; });
        Object.keys(RECORD_KEYS).forEach(key => {
            const kind = recKind(key), local = DB.getItem(key), L = toRecords(key, local);
            let R = byKind[kind];
            const legacy = !R && !this.base[key] && blobs[key] != null; // aún no migrado: el JSON antiguo de la nube cuenta como «nube»
            if (legacy) R = toRecords(key, blobs[key]);
            R = R || {};
            const { merged, newBase, pending } = mergeRecords(L, R, this.base[key] || {});
            const str = fromRecords(key, merged);
            if (local !== null || Object.keys(merged).length) {
                let same = false; try { same = local !== null && canon(JSON.parse(local)) === canon(JSON.parse(str)); } catch (e) { /* valor local roto: se reemplaza */ }
                if (!same) { localStorage.setItem(DB._k(key), str); changed = true; }
            }
            this.base[key] = legacy ? {} : newBase; // migración: todo lo del JSON antiguo hay que subirlo como filas ANTES de borrar el JSON
            if (legacy) this.legacy[key] = 1;
            if (pending || legacy) this.dirty[key] = 1;
        });
        return changed;
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
