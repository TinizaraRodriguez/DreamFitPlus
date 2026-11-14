// ===== ALMACENAMIENTO POR USUARIO =====
// Todo el guardado pasa por aquí. Sin cuenta ("modo local") se usan las claves de siempre (dreamfit_*).
// Con cuenta, cada usuario tiene su propio espacio (dreamfit_u_<id>_*), así que dos personas
// que usen el mismo navegador nunca ven los datos de la otra.
const DB = {
    scope: null, // null = modo local; si no, el id del usuario
    _prefix() { return this.scope ? `dreamfit_u_${this.scope}_` : 'dreamfit_'; },
    _k(key) { return this._prefix() + key.replace(/^dreamfit_/, ''); },
    getItem(key) { return localStorage.getItem(this._k(key)); },
    setItem(key, value) { localStorage.setItem(this._k(key), value); if (typeof Sync !== 'undefined') Sync.mark(key); },
    removeItem(key) { localStorage.removeItem(this._k(key)); if (typeof Sync !== 'undefined') Sync.mark(key); },
    setScope(id) { this.scope = id || null; },
    keys() { // claves lógicas (dreamfit_*) del espacio actual
        const p = this._prefix();
        return Object.keys(localStorage)
            .filter(k => k.startsWith(p) && (this.scope || !k.startsWith('dreamfit_u_')))
            .map(k => 'dreamfit_' + k.slice(p.length));
    },
    // borra el espacio actual de este dispositivo (sin avisar a la nube)
    clearScope() {
        const p = this._prefix();
        Object.keys(localStorage).filter(k => k.startsWith(p) && (this.scope || !k.startsWith('dreamfit_u_'))).forEach(k => localStorage.removeItem(k));
    },
    // Datos guardados antes de tener cuenta (modo local)
    guestKeys() { return Object.keys(localStorage).filter(k => k.startsWith('dreamfit_') && !k.startsWith('dreamfit_u_')); },
    // Mueve los datos del modo local al espacio del usuario actual (sin pisar lo que ya tenga)
    adoptGuestData() {
        let n = 0;
        this.guestKeys().forEach(k => {
            const dest = this._k(k);
            if (localStorage.getItem(dest) === null) { localStorage.setItem(dest, localStorage.getItem(k)); n++; }
            localStorage.removeItem(k);
        });
        return n;
    }
};
