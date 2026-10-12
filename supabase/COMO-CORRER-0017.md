# Comunidad Master IA 360 — Fase 0

Módulo nuevo en `/comunidad`. Todo el código está en `app/comunidad`,
`components/comunidad`, `lib/comunidad` y la migración `0017_comunidad_base.sql`.
No modifica ningún archivo existente.

## Puesta en marcha (en este orden)

1. **Base de datos.** El proyecto `ftzmkynoqtdwzriwkqxt` tenía el esquema `public`
   vacío al revisarlo. Si las migraciones 0001–0016 no se han aplicado ahí,
   aplícalas primero; luego `0017_comunidad_base.sql` (SQL Editor o
   `supabase db push`).
2. **Variables de entorno** (solo nombres, valores en Vercel → Settings → Environment Variables):
   - Ya existentes y necesarias: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `NEXT_PUBLIC_SITE_URL`.
   - Nueva: `COMUNIDAD_ADMIN_EMAILS` — tu correo (varios separados por coma). Entra como
     admin al primer ingreso. Ese correo debe existir como usuario en Supabase Auth
     (el de tu login de `/admin` sirve).
   - Opcional: `COMUNIDAD_RESEND_FROM` si quieres un remitente distinto al del sitio.
3. **Resend:** el dominio del remitente debe tener SPF/DKIM verificados (hasta 48 h).
4. **Hora de la clase 1:** la migración deja `2026-10-22 18:00 (Colombia)` como valor
   provisional. Ajústala en la tabla `mia_cohortes` al horario real: a partir de ahí la
   ficha se bloquea.

## Cómo probar (criterio de éxito de la Fase 0)

1. Entra a `/comunidad/login` con tu correo admin → llega el enlace → «Entrar».
2. `/comunidad/admin/nuevo` desde el celular: nombre, correo, entrada → «Dar de alta».
3. El alumno recibe el correo, toca el botón, acepta el aviso de privacidad y llena la ficha.
4. Prueba con dos cuentas: cada una ve y edita solo su ficha (RLS).
5. `/comunidad/admin` → «Exportar CSV» trae alumnos con sus fichas.
6. `/comunidad/admin/importar` con un CSV (`nombre,correo,entrada,whatsapp`), luego
   «Enviar acceso a pendientes».

## Decisiones de diseño

- El enlace mágico se genera con `auth.admin.generateLink` y se envía por **Resend**, no por el
  SMTP de Supabase: sin límite horario bajo, sin tocar plantillas de Auth (que usa `/admin`),
  y funciona abierto en cualquier dispositivo (el admin da el alta en su celular, el alumno
  abre el correo en el suyo).
- El enlace lleva a una página con botón; el token solo se gasta al pulsarlo (los escáneres
  de correo no lo consumen).
- Un usuario de `auth.users` sin fila en `mia_perfiles` **no** es miembro: la tabla
  `auth.users` se comparte con admin y portal de clientes.
