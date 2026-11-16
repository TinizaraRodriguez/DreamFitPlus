# Mi Plan Fitness (DreamFit)

Aplicación web para planificar y seguir tu entrenamiento, comidas y progreso, pensada para usarse **desde el móvil**. Funciona sin servidor propio: HTML + JavaScript puro, y opcionalmente cuentas y sincronización en la nube con [Supabase](https://supabase.com).

## Funciones

- **Hoy**: resumen del día (agua, comidas, entreno), lista compacta de comidas con hoja para añadir/editar, gráfica de la semana y botón **SOS** para antojos (pasos guiados con temporizador).
- **Objetivo y plan**: al crear la cuenta se pregunta objetivo (ganar músculo, perder grasa, tonificar, salud), nivel, días de fuerza y dónde entrenas (gimnasio o casa con mancuernas). Con eso se monta la semana, las rutinas y las series/repeticiones/descanso (plantillas, sin IA). Se cambia desde Perfil → Mi objetivo.
- **Plan (calendario)**: cada día muestra un punto de color por tipo de entreno hecho (violeta fuerza, azul running, naranja clases, rosa movilidad) y un aro del color planificado en los días futuros.
- **Metabolismo basal y nutrición**: en la bienvenida (y desde Perfil) se piden sexo, edad, altura, peso y nivel de actividad. Con la fórmula Mifflin-St Jeor se calcula el metabolismo basal, el mantenimiento y las calorías y macros según el objetivo (con mínimos de seguridad y sin déficit para menores de 18). Se usan en Perfil, en Recetas (reparto por comida y alimentos recomendados), en la meta de agua de Hoy y en el generador con IA.
- **Seguimiento de comidas**: cada comida puede llevar kcal y proteína aproximadas (Ligera / Normal / Fuerte según tu objetivo, o números a mano). Hoy muestra las barras del día frente a tu objetivo con mensajes sin culpa; es opcional y se puede desactivar. Los totales diarios se guardan para el resumen y el ajuste del plan.
- **Peso y medidas (Progreso)**: historial de peso (uno por día, con editar y borrar), gráfica con rangos y tendencia semanal; el peso más reciente actualiza tus calorías, macros y agua. Las medidas de cintura y cadera también se pueden corregir.
- **Modo entreno**: en el Entreno de fuerza, «Empezar entrenamiento» abre una pantalla guiada: un ejercicio cada vez, una fila por serie (peso y repeticiones), temporizador de descanso (con ±15 s, aviso sonoro y vibración) y la pantalla se mantiene encendida. Al completar cada ejercicio se guarda con sus series y la app propone el peso de la próxima vez.
- **Entreno**: cambia según el tipo de actividad del día (pesas, running con plan por niveles, clases, descanso…). Aprende de las sesiones guardadas: sugiere pesos y ajusta la progresión.
- **Calendario**: plan semanal editable con botón de guardar, vista compacta y usable en móvil, y cambios puntuales por día.
- **Recetas**: generador básico (local, sin IA) por ingredientes, objetivo, momento y sabor; **generador con IA** opcional (Gemini, a través de una función segura de Supabase con límite diario); recetas propias y colección guardada.
- **Progreso**: gráficas en vivo de medidas corporales y de kilómetros por día (varias carreras el mismo día se suman). El historial de medidas solo se muestra aquí.
- **Perfil y cuenta** (botón de arriba a la derecha): registro con email o con Google (opcional, ver guía), inicio de sesión, recuperar y cambiar contraseña, exportar datos, borrar cuenta.
- **Sincronización**: los datos se guardan primero en el dispositivo y se envían a la nube en segundo plano; funciona sin conexión y se actualiza al volver a la app.

## Estructura

```
index.html            Esqueleto: huecos vacíos + carga de scripts (50 líneas)
styles.css            Estilos propios (el resto usa Tailwind por CDN)
_headers              Cabeceras de seguridad y caché (Cloudflare Pages / Netlify)
package.json          Scripts: npm run dev (servidor local) y npm run build (carpeta dist/)
wrangler.jsonc         Configuración de Cloudflare (publica dist/)
scripts/              dev-server.js (servidor local) y build.js (prepara dist/)
js/
  views/              Marcado de la interfaz, una pieza por archivo
    registry.js       Registro de pestañas/hojas; compone la barra inferior y monta todo
    header.js         Cabecera
    tabs/             hoy, calendario, entreno, recetas, progreso, perfil (.js)
    modals/           sos, meal (comida), auth (pantalla de acceso)
  config.js           URL y clave pública de Supabase (vacío = modo local)
  db.js               Capa sobre localStorage, separada por usuario
  sync.js             Sincronización con la nube (cola, reintentos, estado)
  ai.js               Cliente de la función de recetas con IA
  ui.js               Avisos (toast) y diálogos propios: UI.confirm / UI.prompt / showToast
  auth.js             Registro, login, recuperación, cuenta
  storage.js          Exportar / importar datos
  recipe-engine.js    Motor del generador de recetas
  recipes.js          Pestaña Recetas
  calendar.js         Pestaña Calendario
  weight.js          Historial de peso, tendencia y gráfica (Progreso)
  tracking.js        Seguimiento de calorías y proteína del día (hoja de comida, barras en Hoy)
  nutrition.js        Metabolismo basal, calorías, macros, agua y tarjeta de nutrición
  plan.js             Plantillas de plan: objetivo + nivel + días + lugar -> semana, rutinas y series
  onboarding.js       Hoja de bienvenida / cambio de objetivo y tarjeta «Mi objetivo» del Perfil
  workout.js          Pestaña Entreno
  workmode.js         Modo entreno a pantalla completa (series + temporizador de descanso)
  progress.js         Pestaña Progreso
  today.js            Pestaña Hoy
  app.js              Arranque y navegación
supabase/
  01-auth.sql         Función para que cada usuario borre su cuenta
  02-datos.sql        Tabla user_data + seguridad por filas (RLS)
  03-ia.sql           Contador diario de recetas con IA (solo accesible por la función)
  functions/generate-recipe/index.ts   Edge Function que llama a Gemini (la clave vive en Supabase)
LEEME-CONFIGURAR.md   Guía paso a paso para activar cuentas y publicar
```

## Avisos y confirmaciones

No se usan los cuadros del navegador (`alert`, `confirm`, `prompt`). En su lugar, `js/ui.js` ofrece:

```js
if (await UI.confirm({ title: '¿Eliminar?', message: '...', confirmText: 'Eliminar', tone: 'danger' })) { ... }
const t = await UI.prompt({ title: '...', expected: 'ELIMINAR', tone: 'danger' });   // exige escribir el texto
showToast('Guardado ✓');            // el tipo (ok / warn / error) se deduce del texto, o showToast(msg, 'error')
```

Los diálogos son accesibles (foco atrapado, Escape cancela, el foco vuelve al botón de origen), respetan «reducir movimiento» y, en acciones destructivas, el foco empieza en «Cancelar».

## Añadir una pestaña nueva

1. Crea `js/views/tabs/<id>.js` con `Views.addTab({ id, label, icon, nav, html })` (`nav: false` la deja fuera de la barra inferior).
2. Añade su `<script>` en `index.html`, antes de `js/app.js`, y su lógica en `js/<id>.js`.
3. Si debe pintarse al abrirla, añade una línea en `switchTab` (`js/app.js`).

La barra inferior se genera sola a partir de las pestañas registradas. Cuantas más de 5 haya, más conviene moverlas a un menú.

## Ejecutar en local

No hay paso de compilación ni dependencias que instalar. Necesitas [Node.js](https://nodejs.org) 18 o superior:

```bash
npm run dev
# abre http://localhost:5173  (también te muestra la dirección para probar desde el móvil en la misma wifi)
```

Otro puerto: `PORT=3000 npm run dev` (en Windows PowerShell: `$env:PORT=3000; npm run dev`).
El servidor (`scripts/dev-server.js`) no usa librerías y desactiva la caché para ver siempre tus últimos cambios. Sin Node también vale cualquier servidor estático, p. ej. `python3 -m http.server 8000`.

Si pruebas el inicio de sesión (Google o correo) en local, añade `http://localhost:5173` en Supabase → Authentication → URL Configuration → **Redirect URLs**.

Con `js/config.js` vacío la app funciona en **modo local** (sin cuentas; datos solo en el navegador).
Para ver las pantallas de registro sin Supabase, abre `index.html?demo=1` (modo demostración; `?demo=off` lo desactiva). No uses contraseñas reales en ese modo.

## Activar cuentas y nube (Supabase)

1. Crea un proyecto en Supabase (región de Europa).
2. En **SQL Editor** ejecuta, por este orden, `supabase/01-auth.sql` y `supabase/02-datos.sql`.
3. Copia la **Project URL** y la clave **publishable/anon** en `js/config.js`:

   ```js
   window.DREAMFIT_CONFIG = {
     SUPABASE_URL: 'https://TU-PROYECTO.supabase.co',
     SUPABASE_ANON_KEY: 'sb_publishable_...'
   };
   ```
4. En **Authentication → URL Configuration** pon la dirección donde publiques la app en *Site URL* y *Redirect URLs*.

Más detalle y consejos (límite de correos, confirmación de email) en [`LEEME-CONFIGURAR.md`](LEEME-CONFIGURAR.md).

## Publicar

Es un sitio estático: sirve cualquier alojamiento. Recomendado: **Cloudflare Pages** conectado al repositorio de GitHub (gratis, 500 builds al mes). Cada vez que subes cambios a `main` se publica solo.

`npm run build` copia a `dist/` solo lo que necesita la web (`index.html`, `styles.css`, `js/` y `_headers`), así no se publican `supabase/`, este README ni los scripts, y comprueba que no falte ningún archivo que cargue `index.html`.

**Cloudflare** (pasos; los nombres de los menús pueden cambiar). Hoy el asistente crea un *Worker* con archivos estáticos, y el repositorio ya trae el `wrangler.jsonc` que necesita:
1. En <https://dash.cloudflare.com> → **Workers & Pages** → **Create application** → importa el repositorio de GitHub (puede ser privado).
2. **Project name:** `dreamfitplus` (el mismo que el `name` de `wrangler.jsonc`; si usas otro, cámbialo también ahí). **Build command:** `npm run build`. **Deploy command:** `npx wrangler deploy` (el que viene por defecto). Rama de producción `main`.
3. Pulsa **Deploy**. Te da una dirección tipo `https://dreamfitplus.tu-subdominio.workers.dev` (o `.pages.dev` si usas Pages clásico, con directorio de salida `dist`).
4. Añade esa dirección en:
   - Supabase → Authentication → URL Configuration: **Site URL** y **Redirect URLs**.
   - El secreto `ALLOWED_ORIGIN` de la función de IA (varias direcciones separadas por comas).
   - Google Cloud (si usas Google): **Orígenes autorizados de JavaScript**.
5. Prueba el inicio de sesión y, cuando todo funcione, desactiva la publicación automática en Netlify o borra ese proyecto.

Consejo: en los ajustes de compilación puedes desactivar **Preview builds** si solo trabajas en `main`, para no gastar builds.

`_headers` añade cabeceras de seguridad y obliga al navegador a comprobar si hay scripts nuevos (no llevan versión en el nombre).

**Netlify** también sirve: con el comando `npm run build` y el directorio `dist`. Ojo: en su plan gratuito cada publicación gasta 15 de los 300 créditos mensuales.

## Seguridad y privacidad

- La clave `publishable`/`anon` es pública por diseño y puede estar en el código. **Nunca** pongas la clave `secret` ni `service_role` en el repositorio ni en la app.
- La tabla `user_data` tiene RLS: cada usuario solo puede leer y modificar sus propias filas; el acceso anónimo está revocado. Las claves y el tamaño de los valores están validados en la base de datos.
- Al cerrar sesión se borra la copia local del dispositivo.
- Se guardan datos de salud (peso, medidas): si invitas a otras personas, avísalas de que se almacenan en tu proyecto de Supabase.

## Limitaciones conocidas

- La sincronización sobrescribe cada bloque de datos entero (por ejemplo, "medidas"). Si editas lo mismo en dos dispositivos a la vez, gana el último en sincronizar.
- Tailwind se carga por CDN, por lo que la primera visita necesita conexión.

## Próximos pasos

- App instalable (PWA) con modo sin conexión completo.
- Favoritos, filtros y calorías en recetas.
- Fusión por entradas (en vez de por bloque) para datos en forma de lista.

## Licencia

MIT. Consulta el archivo [LICENSE](LICENSE).
