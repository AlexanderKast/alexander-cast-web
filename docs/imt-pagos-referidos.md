# IA Master Tech: pago directo y referidos

Pago de los planes AUTOMATIZA / ACELERA / ESCALA con Stripe Checkout en COP, y programa de referidos con comisión.

## Reglas de negocio (constantes en `lib/imt/pagos.ts`)

| Regla | Valor |
|---|---|
| Mensual | Suscripción Stripe, fee del plan (`content/imt.ts`) |
| Anual | Pago único = fee x 10 (10 meses pagados, 12 de servicio) |
| Contrato mínimo | 3 meses. Se guarda `minimo_hasta` en el pedido; **Stripe no impide cancelar antes**, hay que vigilarlo en `/admin/imt-pagos` |
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
