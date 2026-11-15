// ===== AVISOS Y DIÁLOGOS PROPIOS (sustituyen a alert/confirm/prompt del navegador) =====
// UI.confirm({ title, message, confirmText, cancelText, tone })  -> Promise<boolean>
// UI.prompt({ title, message, expected, placeholder, value, inputType, inputMode, step, confirmText, tone }) -> Promise<string|null>
//     con `expected`, el botón de confirmar no se activa hasta escribirlo exactamente (p. ej. ELIMINAR)
// showToast(mensaje, tipo?) -> aviso breve; tipo: 'ok' | 'warn' | 'error' (si se omite, se deduce del texto)
const UI = (() => {
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const TONES = {
        default: { ring: 'bg-emerald-100 text-emerald-600', icon: 'fa-circle-question', btn: 'bg-emerald-600 hover:bg-emerald-700' },
        warn:    { ring: 'bg-amber-100 text-amber-600',     icon: 'fa-triangle-exclamation', btn: 'bg-amber-500 hover:bg-amber-600' },
        danger:  { ring: 'bg-red-100 text-red-600',         icon: 'fa-trash-can', btn: 'bg-red-600 hover:bg-red-700' }
    };
    const queue = [];
    let open = null; // { root, resolve, prevFocus }

    function show(opts, withInput) {
        return new Promise(resolve => { queue.push({ opts, withInput, resolve }); if (!open) next(); });
    }
    function next() {
        const job = queue.shift();
        if (!job) return;
        const o = job.opts, t = TONES[o.tone] || TONES.default, id = 'ui-dlg-' + Date.now();
        const root = document.createElement('div');
        root.id = 'ui-dialog';
        root.className = 'ui-backdrop fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4';
        root.innerHTML = `<div role="${job.withInput ? 'dialog' : 'alertdialog'}" aria-modal="true" aria-labelledby="${id}-t" ${o.message ? `aria-describedby="${id}-m"` : ''} class="ui-sheet bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-4">
            <div class="flex items-start gap-3">
                <div class="w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${t.ring}"><i class="fa-solid ${esc(o.icon || t.icon)}" aria-hidden="true"></i></div>
                <div class="min-w-0 space-y-1">
                    <h3 id="${id}-t" class="font-bold text-base text-slate-900">${esc(o.title)}</h3>
                    ${o.message ? `<p id="${id}-m" class="text-xs text-slate-600 whitespace-pre-line">${esc(o.message)}</p>` : ''}
                </div>
            </div>
            ${job.withInput ? `<input id="${id}-i" type="${o.inputType || 'text'}" ${o.inputMode ? `inputmode="${esc(o.inputMode)}"` : ''} ${o.step ? `step="${esc(o.step)}"` : ''} value="${esc(o.value || '')}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(o.placeholder || '')}" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">` : ''}
            <div class="flex gap-2">
                <button type="button" data-ui="cancel" class="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-xs cursor-pointer hover:bg-slate-200">${esc(o.cancelText || 'Cancelar')}</button>
                <button type="button" data-ui="ok" class="flex-1 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${t.btn}">${esc(o.confirmText || 'Aceptar')}</button>
            </div>
        </div>`;
        const staleToast = document.getElementById('toast'); if (staleToast) { clearTimeout(staleToast._h); clearTimeout(staleToast._h2); staleToast.style.opacity = 0; staleToast.style.display = 'none'; } // un aviso viejo no debe tapar el diálogo
        const prevFocus = document.activeElement;
        const ok = root.querySelector('[data-ui="ok"]'), cancel = root.querySelector('[data-ui="cancel"]'), input = root.querySelector('input');
        const finish = val => {
            root.remove(); document.body.style.overflow = open.prevOverflow; open = null;
            if (prevFocus && prevFocus.focus && document.contains(prevFocus)) prevFocus.focus();
            job.resolve(val); next();
        };
        const valid = () => !job.withInput || !o.expected || input.value.trim() === o.expected;
        const accept = () => { if (valid()) finish(job.withInput ? input.value.trim() : true); };
        const dismiss = () => finish(job.withInput ? null : false);
        ok.onclick = accept; cancel.onclick = dismiss;
        root.addEventListener('mousedown', e => { if (e.target === root) dismiss(); }); // tocar fuera = cancelar
        if (input) { ok.disabled = !valid(); input.addEventListener('input', () => { ok.disabled = !valid(); }); }
        open = { root, accept, dismiss, prevOverflow: document.body.style.overflow };
        document.body.style.overflow = 'hidden';
        document.body.appendChild(root);
        // En acciones destructivas el foco inicial va a «Cancelar» (más seguro); si hay campo de texto, a él
        (input || (o.tone === 'danger' ? cancel : ok)).focus();
    }

    // Teclado: Escape cancela, Enter confirma, Tab se queda dentro de la ventana. Va en captura para que
    // Escape no cierre además otras hojas (SOS, comida) que haya detrás.
    document.addEventListener('keydown', e => {
        if (!open) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); open.dismiss(); }
        else if (e.key === 'Enter' && !(e.target.closest && e.target.closest('[data-ui="cancel"]'))) { e.preventDefault(); e.stopImmediatePropagation(); open.accept(); }
        else if (e.key === 'Tab') {
            const f = [...open.root.querySelectorAll('input, button:not(:disabled)')];
            if (!f.length) return;
            const first = f[0], last = f[f.length - 1];
            if (!open.root.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
            else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    }, true);

    return {
        confirm: o => show(o, false),
        prompt: o => show(o, true),
        isOpen: () => !!open,
        esc
    };
})();

// ---------- Avisos breves ----------
const TOAST_KINDS = {
    ok:    { icon: 'fa-circle-check',         cls: 'text-emerald-400' },
    warn:  { icon: 'fa-circle-exclamation',   cls: 'text-amber-400' },
    error: { icon: 'fa-circle-xmark',         cls: 'text-red-400' }
};
function toastKind(msg) { // si no se indica, se deduce: avisos de «falta un dato» y errores se distinguen de los éxitos
    if (/^(Introduce|Indica|Escribe|Guarda o descarta|Esa categoría ya existe|Necesitas)/i.test(msg)) return 'warn';
    if (/no se pudo|no válido|sin conexión|ha fallado|algo ha fallado|error/i.test(msg)) return 'error';
    return 'ok';
}
function showToast(msg, kind) {
    msg = String(msg);
    const k = TOAST_KINDS[kind || toastKind(msg)] || TOAST_KINDS.ok;
    let t = document.getElementById('toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        t.className = 'fixed left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-xs z-[90] pointer-events-none';
        document.body.appendChild(t);
    }
    // Abajo (sobre la barra de pestañas) normalmente; arriba si hay un diálogo abierto, para no tapar su contenido
    t.classList.toggle('bottom-24', !UI.isOpen()); t.classList.toggle('top-4', UI.isOpen());
    // Los errores se anuncian con más urgencia a los lectores de pantalla
    t.setAttribute('role', k === TOAST_KINDS.error ? 'alert' : 'status');
    t.innerHTML = `<div class="ui-toast flex items-center gap-2.5 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-2xl shadow-lg">
        <i class="fa-solid ${k.icon} text-base shrink-0 ${k.cls}" aria-hidden="true"></i><span class="min-w-0">${UI.esc(msg.replace(/\s*✓$/, ''))}</span></div>`;
    t.style.display = 'block';
    t.style.opacity = 1;
    const inner = t.firstElementChild; inner.classList.remove('ui-toast'); void inner.offsetWidth; inner.classList.add('ui-toast'); // reinicia la animación
    clearTimeout(t._h);
    t._h = setTimeout(() => { t.style.opacity = 0; t._h2 = setTimeout(() => { t.style.display = 'none'; }, 300); }, k === TOAST_KINDS.error ? 4500 : 2600);
    clearTimeout(t._h2);
}
