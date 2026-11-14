# Mi Plan Fitness (DreamFit)

Aplicación web para planificar y seguir tu entrenamiento, comidas y progreso, pensada para usarse **desde el móvil**. Funciona sin servidor propio: HTML + JavaScript puro, y opcionalmente cuentas y sincronización en la nube con [Supabase](https://supabase.com).

## Funciones

- **Hoy**: resumen del día (agua, comidas, entreno), lista compacta de comidas con hoja para añadir/editar, gráfica de la semana y botón **SOS** para antojos (pasos guiados con temporizador).
- **Entreno**: cambia según el tipo de actividad del día (pesas, running con plan por niveles, clases, descanso…). Aprende de las sesiones guardadas: sugiere pesos y ajusta la progresión.
- **Calendario**: plan semanal editable con botón de guardar, vista compacta y usable en móvil, y cambios puntuales por día.
- **Recetas**: generador que varía según ingredientes disponibles, objetivo, momento de la comida y sabor; recetas propias y colección guardada.
- **Progreso**: gráficas en vivo de medidas corporales y de kilómetros por día (varias carreras el mismo día se suman). El historial de medidas solo se muestra aquí.
- **Cuenta**: registro, inicio de sesión, recuperar y cambiar contraseña, exportar datos, borrar cuenta.
- **Sincronización**: los datos se guardan primero en el dispositivo y se envían a la nube en segundo plano; funciona sin conexión y se actualiza al volver a la app.

## Estructura

```
index.html            Pantalla única con las pestañas y el formulario de acceso
styles.css            Estilos propios (el resto usa Tailwind por CDN)
js/
  config.js           URL y clave pública de Supabase (vacío = modo local)
  db.js               Capa sobre localStorage, separada por usuario
  sync.js             Sincronización con la nube (cola, reintentos, estado)
  auth.js             Registro, login, recuperación, cuenta
  storage.js          Exportar / importar datos
  recipe-engine.js    Motor del generador de recetas
  recipes.js          Pestaña Recetas
  calendar.js         Pestaña Calendario
  workout.js          Pestaña Entreno
  progress.js         Pestaña Progreso
  today.js            Pestaña Hoy
  app.js              Arranque y navegación
supabase/
  01-auth.sql         Función para que cada usuario borre su cuenta
  02-datos.sql        Tabla user_data + seguridad por filas (RLS)
LEEME-CONFIGURAR.md   Guía paso a paso para activar cuentas y publicar
```

## Ejecutar en local

No hay paso de compilación. Sirve la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

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

Es un sitio estático: sirve cualquier alojamiento. Con Netlify basta arrastrar la carpeta a <https://app.netlify.com/drop>.

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

