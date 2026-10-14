# IA Master Tech: pago directo y referidos

Pago de los planes AUTOMATIZA / ACELERA / ESCALA con Stripe Checkout en COP, y programa de referidos con comisión.

## Reglas de negocio (constantes en `lib/imt/pagos.ts`)

| Regla | Valor |
|---|---|
| Mensual | Suscripción Stripe, fee del plan (`content/imt.ts`) |
| Anual | Pago único = fee x 10 (10 meses pagados, 12 de servicio) |
| Contrato mínimo | 3 meses. Al confirmarse el pago mensual, la suscripción pasa a un **calendario de Stripe con 3 cobros comprometidos** y luego se libera y sigue mes a mes. El checkout lo avisa al cliente. Si alguien cancela antes del tercer mes llega un correo al equipo (`DIAGNOSTICO_NOTIFY_TO`). Stripe no impide que el equipo cancele a mano desde el Dashboard, y no hay portal de cliente: el cliente no puede cancelar solo |
| Comisión | 10% del PRIMER pago, solo una por pedido |
| Atribución | Cookie `imt_ref` de 30 días (`/r/CODIGO` o `?ref=CODIGO`) |
| Antifraude | Sin comisión si el comprador usa el mismo correo del referidor o si el referidor está pausado; reembolso total anula la comisión |
| Pago de comisiones | Manual por transferencia; se marca en `/admin/referidos` con la referencia |

## Flujo

1. `/planes` -> "Contratar" -> `/contratar?plan=&periodo=` (datos + aceptación).
2. `POST /api/imt/checkout` crea `imt_pedidos` (pendiente) y la sesión de Stripe. El importe lo decide el servidor.
3. Stripe llama a `POST /api/imt/stripe`. Con `checkout.session.completed` se vuelve a consultar la sesión a Stripe, se valida importe y moneda, el pedido pasa a `pagado`, se crea la comisión y salen los correos.
4. `invoice.paid` registra las renovaciones, `invoice.payment_failed` marca mora, `customer.subscription.deleted` marca cancelada y `charge.refunded` (total) marca reembolsado y anula la comisión.

Idempotencia: cada evento se guarda en `imt_eventos_stripe` por su id. Un evento procesado no se repite; uno fallido se reprocesa cuando Stripe reintenta.

## Puesta en marcha

1. Aplicar `supabase/migrations/0025_imt_pagos_referidos.sql` (revisar antes: NO está aplicada).
2. Variables en Vercel (`.env.example` tiene la lista): `IMT_STRIPE_SECRET_KEY`, `IMT_STRIPE_WEBHOOK_SECRET`; ya deben existir `RESEND_API_KEY`, `RESEND_FROM`, `DIAGNOSTICO_NOTIFY_TO`, `SUPABASE_SERVICE_ROLE_KEY` y `NEXT_PUBLIC_SITE_URL`.
3. En Stripe, crear el endpoint `https://<dominio>/api/imt/stripe` con los eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`, `charge.refunded`.
4. Probar primero en modo test (tarjeta `4242 4242 4242 4242`) con `stripe listen --forward-to localhost:3000/api/imt/stripe`.
5. Confirmar que la cuenta de Stripe tiene COP habilitado para cobrar.

## Si la cuenta de Stripe se comparte con otra app

El webhook ignora cualquier sesión, factura o suscripción sin `metadata.imt_pedido_id`, así que no cruza ventas. Cada endpoint de Stripe tiene su propio secreto.

## Pantallas

- Público: `/contratar`, `/contratar/gracias`, `/referidos`, `/referidos/panel/<token>` (privado, solo por correo).
- Admin (founder y manager): `/admin/imt-pagos`, `/admin/referidos`.

## Pruebas

`npx vitest run --project unit lib/imt` (reglas de cobro y todo el procesamiento del webhook con una base en memoria).

## Portal de clientes (fase 1)

Al confirmarse el pago, el webhook crea el portal del comprador y le envía un **enlace mágico** (sin contraseña).

- **Creación:** `aprovisionarPortal` (`lib/imt/portal.ts`) crea un `portal_clients` con `tipo = 'imt'`, el usuario de Supabase y su vínculo en `portal_client_users`, y enlaza el pedido (`imt_pedidos.portal_client_id`). Es idempotente: una renovación o un segundo plan reutilizan el portal; un reintento del webhook no duplica nada.
- **Acceso:** el enlace lo genera `auth.admin.generateLink` y lo envía Resend. Abre `/portal/entrar`, que solo muestra un botón (los escáneres de correo no gastan el token); el POST a `/portal/entrar/confirmar` canjea el token y exige un portal activo. Quien pierda el enlace pide otro en `/portal/login`. Dura 1 hora y es de un solo uso.
- **Panel del cliente:** `/portal/mi-plan` (plan, contrato mínimo, cobros, botón de tarjeta y facturas). Usa el tema de la comunidad. El portal de agencia (`/portal/[slug]`) no cambia.
- **Tarjeta y facturas:** `POST /api/portal/facturacion` abre el portal de facturación de Stripe del cliente con sesión. El cliente sale de la sesión, nunca de un dato del navegador.
- **Admin:** `/admin/imt-pagos` tiene la columna "Portal" con "Reenviar acceso".

### Configuración en Stripe (una sola vez, en la cuenta IA Master Tech)
1. La clave restringida `IMT_STRIPE_SECRET_KEY` necesita además **Customer portal sessions: Write**.
2. Dashboard → Configuración → Facturación → **Portal del cliente**: activa "Actualizar método de pago" y "Historial de facturas" y **deja desactivada la cancelación** (hay contrato mínimo de 3 meses). Guarda la configuración.
3. Opcional: `IMT_STRIPE_PORTAL_CONFIGURATION` con el id `bpc_…` si no quieres usar la configuración por defecto.

Migración: `0026_imt_portal_clientes.sql`.
