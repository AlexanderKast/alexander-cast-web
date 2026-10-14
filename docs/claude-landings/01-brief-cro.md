# 01 · Brief CRO — landings de Master IA 360

Alcance: dos variantes de landing (venta y asesoría), assets 3D y continuidad visual hacia registro/detalle. No toca backend,
migraciones, RLS, autenticación, webhook ni CRM. Contrato funcional: `docs/claude-comunidad/` (cuenta primero, sin checkout
invitado).

## Brief comercial

| Campo | Contenido (fuente) |
|---|---|
| Público principal | Emprendedor que quiere aplicar IA a un negocio real. Confirmado por la mecánica del programa: cada alumno sube la ficha de su negocio antes de la clase 1 (`master-ia-360/00-contexto…`). |
| Problema | Ya probó herramientas de IA y le cuesta convertirlas en algo aplicado. Formulación del encargo; coincide con la promesa «pasar de probar herramientas a construir». |
| Transformación | Construir con IA, sin programar, los entregables reales del programa: web, app y herramienta. |
| Mecanismo | 8 clases en vivo de 2,5 h (2 por semana, 4 semanas), grabadas; plantillas, prompts y recursos por clase; el grupo vota qué negocio se construye en vivo (web → app → herramienta) y cada alumno lo aplica al suyo; demo day; 60 días de comunidad con live semanal. |
| Objeciones | Experiencia técnica · tiempo · aplicación a su negocio · inversión · acompañamiento · requisitos (plan de pago de Claude, no incluido). |
| Evidencia disponible | Foto real del instructor (`public/assets/images/section/alexander-foto.jpg`); descripción pública de su perfil (`BRAND-CONTEXT.md`, sitio); estructura y entregables definidos. **No hay** testimonios, casos de alumnos ni resultados de cohortes previas: es la primera cohorte. |
| Acción de conversión | Venta: cuenta verificada con intención de compra → compra confirmada. Asesoría: cuenta verificada + solicitud de asesoría guardada. |
| Siguiente paso exacto | Pulsar el CTA lleva a `/comunidad/registro` conservando `programa` (y `asesor=1` en asesoría). Con sesión: al detalle interno del programa (o a su sección `#asesor`). Dueño del programa: «Ir a mi programa». |

## Qué se promete y qué no

Regla del contexto vigente: se promete lo que entrega el instructor (clase, guía, plantilla, revisión), no lo que depende de que el
alumno haga la tarea. Por eso la landing dice «la guía y la plantilla para publicar tu landing» y no «tu landing publicada».
No se inventa un temario por semana (no está definido), ni testimonios, ni garantías, ni escasez distinta de la real
(cupos y ventanas salen de la base).

## Tabla sección → duda → evidencia → CTA → evento

### Landing de venta (`/comunidad/unete`)

| # | Sección | Duda de compra que resuelve | Evidencia | CTA | Evento |
|---|---|---|---|---|---|
| 1 | Hero | ¿Qué es, para quién y qué pasa si pulso? | Titular + subtítulo con datos del programa; escena 3D; microcopy honesto | «Crear cuenta para comprar» (hero) | `landing_view`, `primary_cta_click{cta_position=hero}` |
| 2 | Qué vas a construir | ¿Qué me llevo concretamente? | Entregables por clase (3, 6, 7, 8) y su límite | — (el CTA fijo móvil aparece al salir del hero) | — |
| 3 | El cambio de enfoque | ¿En qué se diferencia de seguir probando herramientas? | Tres contrastes derivados de la mecánica real | — | — |
| 4 | Cómo se aprende | ¿Cómo es el acompañamiento y el ritmo? | Secuencia real (ficha, 8 clases, votación, demo day, 60 días) | — | — |
| 5 | Instructor | ¿Quién me enseña y por qué confiar? | Foto real; perfil publicado; aviso explícito de «primera cohorte, sin testimonios» | Enlace a «Sobre mí» | — |
| 6 | Qué incluye y qué no | ¿Qué pago exactamente y qué me falta? | Lista de lo incluido; no incluido (plan de Claude, VIP, sin garantía de resultados) | — | — |
| 7 | Entradas | ¿Cuánto cuesta, hasta cuándo y qué cambia entre entradas? | Ofertas, precios, ventanas y cupos **desde la base** (la misma fuente del cobro) | «Crear cuenta y elegir» / «Elegir X» | `primary_cta_click{cta_position=oferta-<slug>}` |
| 8 | Para quién sí / no | ¿Es para mí? | Criterios sustentados en la mecánica del programa | — | — |
| 9 | FAQ + cierre | Objeciones restantes | FAQ por objeción; mismo CTA que el hero | «Crear cuenta para comprar» | `primary_cta_click{cta_position=cierre}` |

### Landing de asesoría (`/comunidad/unete/asesoria`)

| # | Sección | Duda | Evidencia | CTA | Evento |
|---|---|---|---|---|---|
| 1 | Hero | ¿Esto es gratis? ¿qué es? | «Programa de pago» visible; crear cuenta es gratis | «Crear cuenta y solicitar asesoría» | `landing_view`, `advisor_cta_click{hero}` |
| 2 | Para quién | ¿Encajo? | Criterios | — | — |
| 3 | Ejemplos de lo que permite | ¿Qué podría construir? | Entregables (ilustraciones, no resultados) | — | — |
| 4 | Cómo funciona la asesoría | ¿Qué pasa cuando la pido? | 4 pasos, sin plazos prometidos | — | — |
| 5 | Instructor | ¿Quién es? | Igual que venta | enlace | — |
| 6 | Cierre | Siguiente paso | Microcopy de asesoría | «Crear cuenta y solicitar asesoría» | `advisor_cta_click{cierre}` |
| 7 | Dudas | Dudas prácticas | FAQ de asesoría | enlace secundario a compra | — |

## Evaluación heurística (no empírica)

Criterios de `page-cro` aplicados como lista de comprobación, **sin puntuación numérica**: no hay datos de tráfico ni de anuncios,
así que *traffic–message match* y tasa base quedan **pendientes** y no se inventa un índice.

| Criterio | Evidencia en la página | Límite |
|---|---|---|
| Propuesta de valor en ≤5 s | H1 con destinatario+resultado; subtítulo con duración y mecanismo; un CTA dominante | Sin prueba con usuarios |
| Foco en un objetivo | Un CTA principal por variante, repetido tras entregables/ofertas/cierre; el secundario es otra intención | — |
| Message match | Pendiente: no hay anuncio ni UTM reales; la landing hereda `utm_*`/`o=stand` saneados | Depende de los anuncios de la feria |
| Confianza | Foto real, límites explícitos, sin insignias inventadas | Sin testimonios: se dice |
| Fricción | Registro mínimo existente; sin popup, sin autoplay con sonido, CTA fijo solo móvil | WhatsApp solo si se elige ese canal |
| Objeciones | FAQ por objeción + «para quién no es» | — |

## Dependencias y decisiones abiertas

- Fecha de la sesión de arranque (19–21 oct) y de la clase de bono: la landing no la muestra mientras sea `null`.
- Frase pública sobre la app de la feria / acuerdo con Effi: **no** se usa en la página hasta que esté confirmada por escrito.
- Anuncios y UTM de la feria: sin ellos no hay *message match* medible.
- Testimonios: no existen; cuando haya cohorte, requieren fuente, autorización y vínculo real al producto.
- Qué es Primixia: sin definir; no aparece.
- Handle de redes: el contexto de marca da `@alexemprendee` y el del programa `@elmaster.ia`; la página no lo muestra hasta que se aclare.
