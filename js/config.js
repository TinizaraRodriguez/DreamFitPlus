// ===== CONFIGURACIÓN DEL SERVIDOR (cuentas) =====
// Si estos dos valores están vacíos, la app funciona en "modo local": sin cuentas, con los datos solo en este dispositivo.
// La clave "publishable" es PÚBLICA por diseño (va en la web); la seguridad la dan las reglas de la base de datos.
// NUNCA pongas aquí la clave "secret" ni la "service_role".
window.DREAMFIT_CONFIG = {
    SUPABASE_URL: 'https://qyiyrnjvcusshxtvrkns.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_saSXEYwEi5YrlHglezbZwQ_cXcQ2Z2u',
    // Pon true SOLO después de activar Google en Supabase (ver LEEME-CONFIGURAR.md, apartado «Entrar con Google»).
    GOOGLE_LOGIN: true,
    // Pon true SOLO después de desplegar la función «generate-recipe» y crear la tabla de 03-ia.sql (ver LEEME-CONFIGURAR.md).
    AI_RECIPES: false
};
