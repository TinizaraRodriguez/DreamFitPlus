// ===== POLÍTICA DE PRIVACIDAD =====
// Un solo texto para la hoja de la app y para la página pública privacidad.html (así nunca se desincronizan).
// Los datos del responsable salen de js/config.js (PRIVACY_CONTROLLER y PRIVACY_EMAIL).
// IMPORTANTE: si cambia lo que hace la app con los datos de forma importante, actualiza este texto y sube CONSENT_VERSION
// (a todo el mundo se le volverá a pedir el consentimiento).
const CONSENT_VERSION = 1;
const POLICY_DATE = '16 de noviembre de 2026';

function privacyHtml() {
    const cfg = window.DREAMFIT_CONFIG || {};
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const who = cfg.PRIVACY_CONTROLLER ? esc(cfg.PRIVACY_CONTROLLER) : '';
    const mail = cfg.PRIVACY_EMAIL ? `<a class="underline text-emerald-700" href="mailto:${esc(cfg.PRIVACY_EMAIL)}">${esc(cfg.PRIVACY_EMAIL)}</a>` : '';
    const contact = who || mail
        ? `<p><b>Responsable:</b> ${who || 'la persona que mantiene esta app'}${mail ? ' · <b>Contacto:</b> ' + mail : ''}</p>`
        : '<p class="text-amber-800 bg-amber-50 rounded-lg p-2"><b>Falta completar el responsable y el email de contacto.</b> Rellena PRIVACY_CONTROLLER y PRIVACY_EMAIL en js/config.js.</p>';
    const h = t => `<h3 class="font-bold text-slate-900 pt-2">${t}</h3>`;
    const li = a => `<ul class="list-disc pl-5 space-y-1">${a.map(x => `<li>${x}</li>`).join('')}</ul>`;
    return `<div class="space-y-2 text-xs text-slate-700 leading-relaxed">
        <p class="text-[11px] text-slate-500">Última actualización: ${POLICY_DATE}</p>
        ${contact}

        ${h('1. Qué datos guarda esta app')}
        ${li([
            '<b>Cuenta:</b> tu nombre, tu email y tu contraseña (la contraseña la gestiona el servicio de autenticación y se guarda cifrada; la app nunca la ve en claro). Si entras con Google, recibimos tu nombre y tu email.',
            '<b>Datos de salud y hábitos</b> que tú introduces: sexo, edad, altura, peso e historial de peso, medidas de cintura y cadera, nivel de actividad y objetivo.',
            '<b>Tu actividad:</b> entrenos, pesos y repeticiones, carreras, agua, comidas con calorías y proteína aproximadas, recetas guardadas y marcas del calendario.'
        ])}
        <p>No pedimos ni guardamos dirección, teléfono, datos de pago ni ubicación, y no usamos publicidad ni analítica de seguimiento.</p>

        ${h('2. Para qué se usan')}
        ${li([
            'Calcular tu metabolismo basal, tus calorías, macros y agua, y montar tu plan de entrenos.',
            'Mostrarte tu progreso (gráficas, resumen semanal) y proponerte ajustes del plan. Son cálculos automáticos sencillos: <b>tú decides</b> si los aceptas.',
            'Guardar tus datos en la nube para que puedas verlos desde varios dispositivos.',
            'No se venden ni se ceden a terceros con fines comerciales.'
        ])}

        ${h('3. Base legal')}
        <p>Tu <b>consentimiento explícito</b> (artículos 6.1.a y 9.2.a del RGPD), porque el peso, las medidas y los hábitos pueden considerarse datos relativos a la salud. Lo das al crear la cuenta o al entrar por primera vez, y puedes retirarlo en cualquier momento eliminando tu cuenta (sección 8); eso no afecta a lo ya tratado.</p>

        ${h('4. Quién más interviene')}
        ${li([
            '<b>Supabase</b> (base de datos y autenticación): guarda tu cuenta y tus datos. Cada persona solo puede leer y modificar los suyos.',
            '<b>Cloudflare</b> (alojamiento de la web): recibe tu dirección IP y datos técnicos de la conexión al cargar la app.',
            '<b>Google</b>, solo si eliges «Continuar con Google» (acceso) o la opción de recetas con IA (Gemini). Para la IA se envían únicamente los ingredientes, el momento de la comida, el sabor, lo que escribas en «alergias o restricciones» y un objetivo orientativo de calorías y proteína. <b>No se envía tu nombre ni tu email.</b> No escribas datos que te identifiquen en ese campo.',
            '<b>Librerías externas</b> (jsDelivr, cdnjs y Google Fonts): al abrir la app tu navegador las descarga y esos servicios pueden ver tu IP.',
            'Si algún proveedor trata datos fuera del Espacio Económico Europeo, lo hace con las garantías del RGPD (por ejemplo, cláusulas contractuales tipo).'
        ])}

        ${h('5. Cuánto tiempo se conservan')}
        <p>Mientras tengas la cuenta. Si la eliminas, se borran tu cuenta y tus datos. Las copias de seguridad técnicas de los proveedores pueden conservarlos un periodo limitado. En «modo local» (sin cuenta) los datos solo están en tu dispositivo y los controlas tú.</p>

        ${h('6. Qué guarda tu dispositivo')}
        <p>La app usa el almacenamiento del navegador (localStorage) solo para funcionar: tus datos, la sesión y tu preferencia de tema claro u oscuro. No usa cookies de publicidad ni de seguimiento. Al cerrar sesión con cuenta, se borra la copia local de ese dispositivo.</p>

        ${h('7. Seguridad')}
        <p>Conexión cifrada (HTTPS), contraseñas gestionadas por el servicio de autenticación y reglas en la base de datos para que nadie vea los datos de otra persona. Ningún sistema es infalible: usa una contraseña única y no la compartas.</p>

        ${h('8. Tus derechos')}
        <p>Puedes acceder, rectificar, suprimir, limitar, oponerte y llevarte tus datos, y retirar tu consentimiento. Desde la app (Perfil → Privacidad y tus datos):</p>
        ${li([
            '<b>Acceder y llevártelos:</b> «Descargar mis datos» (archivo ZIP con tablas para Excel y una copia completa).',
            '<b>Rectificar:</b> edita tu peso, medidas, carreras y perfil desde las propias pantallas.',
            '<b>Suprimir:</b> «Eliminar mi cuenta y mis datos» (cuenta) o «Borrar los datos de este dispositivo» (modo local).'
        ])}
        <p>Si necesitas otra cosa, escribe al contacto indicado arriba. Si crees que no tratamos bien tus datos, puedes reclamar ante la autoridad de control de tu país (en España, la Agencia Española de Protección de Datos, <span class="underline">aepd.es</span>).</p>

        ${h('9. Menores')}
        <p>La app está pensada para mayores de 14 años. Si tienes menos de esa edad, necesitas el permiso de tu madre, padre o tutor. En menores de 18 no se aplican déficits de calorías.</p>

        ${h('10. Aviso importante')}
        <p>Las calorías, macros, agua y consejos son estimaciones orientativas, no un consejo médico ni nutricional. Consulta con un profesional sanitario antes de cambiar tu dieta o tu entrenamiento, sobre todo si tienes alguna condición de salud.</p>

        ${h('11. Cambios en esta política')}
        <p>Si cambia de forma importante, te lo diremos al entrar y te pediremos de nuevo el consentimiento. La fecha de arriba indica la última versión.</p>
    </div>`;
}

// ---------- Hoja dentro de la app ----------
function openPrivacy() {
    const m = document.getElementById('privacy-modal'); if (!m) return;
    document.getElementById('privacy-body').innerHTML = privacyHtml();
    m.classList.remove('hidden'); m.classList.add('flex');
    document.getElementById('privacy-body').scrollTop = 0;
    const b = document.getElementById('privacy-close'); if (b) b.focus();
}
function closePrivacy() { const m = document.getElementById('privacy-modal'); if (m) { m.classList.add('hidden'); m.classList.remove('flex'); } }
const privacyOpen = () => { const m = document.getElementById('privacy-modal'); return !!m && !m.classList.contains('hidden'); };
