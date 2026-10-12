# 05 · Medición y plan de experimentos

Se reutiliza la analítica existente (`@vercel/analytics`, cliente y servidor). No se instaló ningún píxel ni proveedor. Ningún evento
lleva correo, nombre, teléfono, tokens, ids de usuario/pedido ni enlaces privados.

## Eventos

| Evento | Dónde se dispara | Cuándo | Propiedades |
|---|---|---|---|
| `landing_view` | cliente (`VistaLanding`) | al cargar la landing | `product_id`, `landing_variant` (venta/asesoria) |
| `primary_cta_click` | cliente (`EnlaceInteres`) | clic en un CTA de la landing de venta | `product_id`, `landing_variant`, `cta_position` (hero, oferta-<slug>, cierre, fijo-movil) |
| `advisor_cta_click` | cliente | clic en un CTA de la landing de asesoría | idem |
| `registration_started` | cliente (`FormRegistro`) | primera interacción con el formulario | `product_id`, `landing_variant` |
| `registration_verified` | **servidor** | correo verificado (ya existía) | producto/oferta |
| `internal_product_view` | cliente (`EventoUnaVez`) | vista del detalle privado del programa | `product_id` |
| `checkout_started` | **servidor** | pedido propio creado y sesión de Stripe abierta (ya existía) | oferta |
| `advisor_requested` | **servidor** | solicitud **ya guardada** (equivale a `advisor_request_saved`) | producto |
| `qualified_opportunity` | **servidor** | el comercial asignado pasa la oportunidad a «propuesta» | producto |
| `purchase_confirmed` | **servidor** | pago confirmado por el webhook, deduplicado por evento de Stripe (ya existía) | oferta |

Un clic no es un lead y visitar «gracias» no es una compra: los eventos de conversión salen solo del servidor tras éxito real.

**Definición de oportunidad cualificada** (propuesta, a validar con Alexander): la persona pidió asesoría con consentimiento de
contacto, fue contactada y el comercial asignado la llevó al estado «propuesta». Quien califica: el comercial asignado (o admin).
Hasta que se acepte esta definición, `qualified_opportunity` no debe usarse como KPI.

## Embudos y denominadores

- Venta: `landing_view` → `primary_cta_click` → `registration_started` → `registration_verified` → `internal_product_view` → `checkout_started` → `purchase_confirmed`.
- Asesoría: `landing_view` → `advisor_cta_click` → `registration_verified` → `advisor_requested` → `qualified_opportunity` → `purchase_confirmed`.

| Tasa | Numerador / denominador |
|---|---|
| Cuenta verificada por visitante | `registration_verified` / `landing_view` (misma variante) |
| Solicitud por visitante de asesoría | `advisor_requested` / `landing_view{asesoria}` |
| Compra por visitante de venta | `purchase_confirmed` / `landing_view{venta}` |
| Calidad de la solicitud | `qualified_opportunity` / `advisor_requested` |
| Abandono del registro | 1 − `registration_verified` / `registration_started` |

Ventana de atribución propuesta: 7 días desde el primer `landing_view` del mismo navegador; las ventas asistidas pueden cerrar
después, así que se reportan aparte. Deduplicación: el pago por `stripe_event_id` (ya implementado); los eventos de cliente son
orientativos (bloqueadores de anuncios, varios dispositivos).

## Experimentos (solo hipótesis; sin ganador)

No hay volumen ni anuncios aún, por lo que **no se aleatoriza ninguna variante**. Cada hipótesis queda lista para cuando haya muestra.

| # | Cambio | Mecanismo esperado | Métrica | Guardrail | Criterio de decisión |
|---|---|---|---|---|---|
| H1 | Titular A («Aprende a construir una web, una app y una herramienta…») vs B («Pasa de “probé IA” a tener…») | A nombra el resultado concreto; B apela a la frustración | `primary_cta_click`/`landing_view` y `registration_verified`/`landing_view` | Tasa de reembolso y de abandono del registro | Decidir solo con muestra suficiente y sin diferencias de tráfico por canal |
| H2 | CTA «Crear cuenta para comprar» vs «Crear cuenta y ver las entradas» | La primera es explícita sobre el pago; la segunda baja la percepción de compromiso | `registration_verified`/clics | Compradores/cuentas verificadas (para no atraer cuentas sin intención) | Priorizar compras, no clics |
| H3 | Con/sin vídeo del hero (poster estático) | El movimiento explica el «ensamblado» pero cuesta peso | LCP/INP de campo y `primary_cta_click` | LCP ≤ 2,5 s p75 | Retirar el vídeo si degrada Core Web Vitals |
| H4 | Desviar tráfico frío a asesoría vs venta | El tráfico frío necesita acompañamiento | compras / visitantes, calidad del lead | Costo de atención comercial | Comparar por fuente de tráfico |

Se priorizan ventas y calidad del lead por encima de clics.
