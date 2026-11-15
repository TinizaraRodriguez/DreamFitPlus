// ===== CONFIGURACIÓN DEL SERVIDOR (cuentas) =====
// Si estos dos valores están vacíos, la app funciona en "modo local": sin cuentas, con los datos solo en este dispositivo.
// La clave "publishable" es PÚBLICA por diseño (va en la web); la seguridad la dan las reglas de la base de datos.
// NUNCA pongas aquí la clave "secret" ni la "service_role".
window.DREAMFIT_CONFIG = {
    SUPABASE_URL: 'https://qyiyrnjvcusshxtvrkns.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_saSXEYwEi5YrlHglezbZwQ_cXcQ2Z2u',
    GOOGLE_LOGIN: true,
    AI_RECIPES: true
};
