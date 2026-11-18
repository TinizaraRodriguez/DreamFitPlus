# Activar las cuentas (Supabase)

Mientras `js/config.js` esté vacío, la app funciona en **modo local** (sin cuentas, datos solo en el dispositivo).
Para activar el registro y el inicio de sesión:

## 1. Crear el proyecto en Supabase
1. Crea una cuenta gratuita en https://supabase.com y pulsa **New project**.
2. Elige una región de **Europa** (por ejemplo Frankfurt, París o Londres) y una contraseña de base de datos (guárdala; no la necesitas en la app).

## 2. Configurar el inicio de sesión
En **Authentication** (los nombres de los menús pueden variar un poco):
- **Sign In / Providers → Email**: activado.
- **Confirm email** (confirmar email): recomendado **activado**, para que nadie se registre con emails ajenos.
  - Ojo: el envío de correos que incluye Supabase por defecto tiene un límite **muy bajo** por hora. Si varios amigos se registran a la vez, algunos correos no llegarán. Para las primeras pruebas puedes desactivarlo, o configurar más adelante un servicio de correo propio.

## 3. Crear las tablas (2 pasos, en este orden)
**SQL Editor → New query** → pega el contenido de `supabase/01-auth.sql` → **Run**.
Después otra consulta nueva con `supabase/02-datos.sql` → **Run**.
- `01-auth.sql`: función para que cada usuario pueda borrar su cuenta.
- `02-datos.sql`: tabla donde se guardan los datos de cada usuario. Cada persona solo puede ver y modificar **sus** filas (seguridad por filas / RLS). Se puede ejecutar más de una vez sin problema.

Si te saltas el paso 2, la app avisa en la tarjeta de cuenta: "falta ejecutar supabase/02-datos.sql".

## 4. Pegar las claves en la app
En **Project Settings → API** copia:
- **Project URL** → `SUPABASE_URL`
- La clave **pública** (`anon` o `publishable`, empieza por `sb_publishable_…`; es pública por diseño, puede ir en el código) → `SUPABASE_ANON_KEY`

Pégalas en `js/config.js`. **Nunca** uses la clave `service_role` / `secret` en la app.

## 5. Publicar y avisar a Supabase de la dirección
1. Publica la web (recomendado Cloudflare Pages conectado a GitHub; mira «Publicar» en el README) y copia la dirección que te da.
2. En Supabase → **Authentication → URL Configuration**: pon esa dirección en **Site URL** y añádela también en **Redirect URLs**.
   Sin esto, los enlaces de los correos (confirmar cuenta, recuperar contraseña) no vuelven a la app.

## 6. Probar
Regístrate en un dispositivo, apunta algo (agua, una comida), entra con la misma cuenta en otro (o en otro navegador) y comprueba que aparece. En Progreso → Cuenta se ve el estado: "Sincronizado", "Sin conexión: se enviará al volver", etc.
Después regístrate con tu email, cierra sesión, entra de nuevo y prueba "¿Olvidaste tu contraseña?".

---
### Probar las pantallas sin Supabase
Abre `index.html?demo=1` para ver el registro y el login en **modo demostración**
(las cuentas se guardan solo en ese navegador; no uses tu contraseña real). Con `?demo=off` vuelves al modo local.

---
### Cómo funciona la sincronización
- Los datos se guardan primero en el dispositivo y se envían a la nube en segundo plano (1 s después de cada cambio). Sin conexión la app sigue funcionando y envía lo pendiente al volver.
- Al abrir la app o volver a ella se descargan los cambios de otros dispositivos. Si hay un cambio sin enviar en este dispositivo, ese gana.
- Limitación conocida: cada bloque de datos (por ejemplo "medidas") se sobrescribe entero. Si editas lo mismo en dos dispositivos a la vez, gana el último en sincronizar.
- Al cerrar sesión se borra la copia local del dispositivo (importante en móviles compartidos).

### Privacidad
Los amigos que prueben guardan datos de salud (peso, medidas) en tu proyecto de Supabase. Avísales, y usa solo la clave pública en la app.

---
### Política de privacidad (antes de invitar a otras personas)
1. En `js/config.js` rellena `PRIVACY_CONTROLLER` (tu nombre o el de tu proyecto) y `PRIVACY_EMAIL` (un email al que puedan escribir para ejercer sus derechos). Mientras estén vacíos, la política muestra un aviso en ámbar.
2. Lee el texto (`js/privacy.js`, o la página `/privacidad.html` de tu web) y compruébalo: describe lo que hace la app hoy.
3. Si usas «Entrar con Google»: en Google Cloud → **Pantalla de consentimiento de OAuth** pon como *enlace de la política de privacidad* `https://TU-DIRECCION/privacidad.html`.
4. Cada persona que se registre (o entre por primera vez con Google) acepta la política; queda guardada con su fecha en su cuenta.

### Entrar con Google (opcional)
Hasta que hagas esto, el botón no aparece (`GOOGLE_LOGIN: false` en `js/config.js`).

**1. Google Cloud** (https://console.cloud.google.com, gratis, hace falta cuenta de Google):
1. Crea un proyecto nuevo (por ejemplo «DreamFit»).
2. **APIs y servicios → Pantalla de consentimiento de OAuth** (o «Google Auth Platform»): tipo **Externo**, nombre de la app, tu email de contacto. Los permisos básicos (email, perfil, openid) bastan.
3. Mientras la app esté en modo **Pruebas**, solo podrán entrar los emails que añadas como «Usuarios de prueba» (máx. 100). Para que entre cualquiera, pulsa **Publicar aplicación**: con permisos básicos no exige verificación.
4. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web**:
   - **Orígenes autorizados de JavaScript**: la dirección de tu web (ej. `https://tu-proyecto.pages.dev`).
   - **URI de redireccionamiento autorizados**: `https://TU-PROYECTO.supabase.co/auth/v1/callback` (con tu URL de Supabase; en Supabase → Authentication → Sign In / Providers → Google aparece ya copiada).
5. Copia el **ID de cliente** y el **Secreto de cliente**.

**2. Supabase**: Authentication → Sign In / Providers → **Google** → activar, pegar ID y secreto → Guardar.
El **secreto de cliente se pega solo en Supabase**: nunca en el código ni en GitHub.

**3. La app**: en `js/config.js` pon `GOOGLE_LOGIN: true`, sube el cambio a GitHub y espera a que se publique.

**Cosas a saber**
- Si alguien ya tenía cuenta con email y contraseña y entra con Google usando el mismo email, Supabase las une en una sola cuenta.
- Quien entra solo con Google no tiene contraseña: el perfil no le ofrece «Cambiar contraseña».
- Si el botón da el aviso «aún no está activado», revisa el paso 2. Si Google dice «redirect_uri_mismatch», revisa los URI del paso 1.4.

---
### Recetas con IA (opcional, Gemini)
La web **nunca** habla con Gemini directamente ni lleva la clave: llama a una función segura en Supabase que comprueba la sesión, aplica un límite diario por usuario y guarda la clave como secreto. Hasta que lo hagas, el botón «Generar con IA» no aparece (`AI_RECIPES: false` en `js/config.js`) y el generador básico sigue funcionando.

1. **Clave de Gemini**: entra en https://aistudio.google.com/apikey con tu cuenta de Google → **Crear clave de API** (elige el proyecto DreamFitPlus). Cópiala. No la pegues en el código ni en GitHub.
2. **Base de datos**: en Supabase → SQL Editor → pega `supabase/03-ia.sql` → Run. Crea el contador diario (nadie puede leerlo desde la app).
3. **La función**: Supabase → **Edge Functions → Deploy a new function → Via Editor**. Nómbrala exactamente `generate-recipe`, pega el contenido de `supabase/functions/generate-recipe/index.ts` y despliega. Desactiva «Verify JWT» si te da un error 401 «Invalid JWT»: la función ya comprueba la sesión por su cuenta.
4. **Secretos**: Edge Functions → **Secrets** → añade `GEMINI_API_KEY` con tu clave. Opcionales:
   - `AI_DAILY_LIMIT`: recetas por usuario y día (por defecto 10).
   - `ALLOWED_ORIGIN`: la dirección de tu web, para que solo ella pueda llamar a la función.
   - `GEMINI_MODEL`: el modelo a usar, o varios separados por comas (se prueban por orden si el primero falla o no responde). Por defecto `gemini-3.8-flash,gemini-flash-latest,gemini-flash-lite-latest`. Si Google dice que un modelo está saturado (error 503), pasa al siguiente. **Google retira modelos con el tiempo**: si la app dice que la IA «aún no está lista» o «el modelo ya no existe», mira en AI Studio el nombre del modelo Flash vigente y ponlo aquí.
5. **La app**: en `js/config.js` pon `AI_RECIPES: true`, súbelo a GitHub y espera a que se publique.
6. **Probar**: inicia sesión → Recetas → escribe ingredientes (o déjalo vacío para que la IA proponga recetas a tus macros y lo que hay que comprar) → «Generar con IA».
   - Si ya tenías la función desplegada, **vuelve a pegar `supabase/functions/generate-recipe/index.ts`** y pulsa Deploy: ahora acepta ingredientes vacíos y devuelve también hidratos y grasas.

**Coste y privacidad**
- Con el plan gratuito de Gemini hay límites de uso; el límite diario por usuario evita sorpresas. No actives facturación en Google Cloud para esto.
- A Gemini solo se envían los ingredientes, el momento, el sabor y las alergias/restricciones que escriba la persona. **Nunca** su nombre, email ni datos de entreno. Aun así, las alergias son datos de salud: avisa a tus amigos y revisa las condiciones de uso de datos del plan gratuito de Gemini, que pueden permitir a Google usar las peticiones para mejorar sus productos.
- Las recetas de la IA son aproximadas y pueden fallar: la web lo avisa y recuerda revisar alergias.
