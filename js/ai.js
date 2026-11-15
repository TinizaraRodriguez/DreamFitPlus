// ===== RECETAS CON IA =====
// La web NUNCA habla con Gemini directamente: llama a la función segura «generate-recipe» de Supabase,
// que guarda la clave, comprueba la sesión y aplica el límite diario (ver supabase/functions/generate-recipe).
const AiRecipes = {
    TIMEOUT_MS: 90000,
    enabled() {
        return typeof Auth !== 'undefined' && Auth.mode === 'supabase' && !!Auth.user && (window.DREAMFIT_CONFIG || {}).AI_RECIPES === true;
    },
    async generate(payload) {
        const client = SupabaseBackend.client;
        const call = client.functions.invoke('generate-recipe', { body: payload });
        const timeout = new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), this.TIMEOUT_MS));
        let res;
        try { res = await Promise.race([call, timeout]); }
        catch (e) { throw { code: e && e.code === 'timeout' ? 'timeout' : 'network' }; }
        if (res.error) throw await this.readError(res.error);
        const d = res.data;
        if (!d || !Array.isArray(d.recipes) || !d.recipes.length) throw { code: 'empty' };
        return d;
    },
    async readError(err) { // FunctionsHttpError trae la respuesta en context
        try {
            const ctx = err && err.context;
            if (ctx && typeof ctx.json === 'function') { const j = await ctx.json(); return { code: j.code || 'upstream', message: j.error, limit: j.limit }; }
        } catch { /* sin cuerpo */ }
        return { code: /fetch|network/i.test(String(err && err.name) + String(err && err.message)) ? 'network' : 'upstream' };
    },
    message(e) {
        switch (e && e.code) {
            case 'quota': return e.message || 'Has llegado al límite de recetas con IA de hoy. Mañana podrás pedir más.';
            case 'busy': return 'La IA está saturada ahora mismo. Inténtalo en un minuto.';
            case 'timeout': return 'La IA tarda demasiado. Inténtalo de nuevo.';
            case 'network': return 'Sin conexión con la IA. Comprueba tu internet.';
            case 'auth': return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';
            case 'input': case 'empty': return e.message || 'Con esos datos no he podido montar una receta. Prueba con otros ingredientes.';
            case 'not_configured': return 'La IA aún no está lista en el servidor: falta la clave de Gemini (secreto GEMINI_API_KEY). Avisa a quien administra la app.';
            case 'quota_setup': return 'La IA aún no está lista en el servidor: falta ejecutar supabase/03-ia.sql. Avisa a quien administra la app.';
            case 'model': return 'La IA aún no está lista en el servidor: el modelo de Gemini configurado no existe. Hay que cambiar el secreto GEMINI_MODEL. Avisa a quien administra la app.';
            default: return 'La IA no ha podido responder ahora mismo.';
        }
    }
};
