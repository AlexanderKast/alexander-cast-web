# 02 · Dirección de arte y copy

## Concepto: «De una idea a un sistema que funciona»

Estudio de producto digital, contemporáneo y humano. Base marfil (`#fafbf7`), texto casi negro y lima del módulo; una banda oscura de alto contraste para la
historia con scroll y otra para el instructor. Tipografías de la marca (Space Grotesk, Inter, JetBrains Mono): la jerarquía sale de escala, peso y ritmo.

**Elemento memorable:** tres módulos físicos —web, app y herramienta— en cerámica marfil y grafito mate, unidos por una línea lima luminosa. Se generaron con
Magnific, se animaron en video y se recortaron **sin fondo**, de modo que se funden con la página (en el hero sobre marfil y en la historia sobre negro).

## Storytelling con scroll (la parte vendedora)

La sección «historia» fija la escena mientras se recorre la página; **el video avanza con el scroll** y el texto cambia de capítulo. Cada capítulo responde una
duda de compra y el último lleva el CTA:

| Cap. | Mensaje (duda que resuelve) | Lo que hace el video |
|---|---|---|
| 1 · El resultado | «Tu negocio con su web, su app y su herramienta, conectadas» (¿qué gano?) | Los tres módulos ensamblados |
| 2 · Hoy | «Tienes piezas sueltas» (¿por qué me pasa esto?) | Se elevan y se separan |
| 3 · Clase 3 | Una web: guía y plantilla para publicar tu landing (¿qué me llevo?) | El pulso lima recorre la conexión |
| 4 · Clase 6 | Una app: prototipo y guía para conectar datos | El pulso sigue hacia la app |
| 5 · Clases 7 y 8 | Una herramienta (cotizador/calculadora) y tu primera tarea automatizada | El pulso enciende la herramienta |
| 6 · El camino | Sistema que funciona, con 8 clases en vivo, plantillas y 60 días de comunidad + **CTA** | Vuelve a ensamblarse y brilla |

Otros efectos (todos con respeto a «reducir movimiento»): aparición progresiva de los bloques al entrar en pantalla, cifras que cuentan hasta su valor real (8 clases,
2,5 h, 4 semanas, 60 días), barra de progreso de lectura, ligero paralaje de la escena del hero (CSS `animation-timeline`), CTA fijo en móvil que aparece al salir
del hero y se oculta cuando ya hay un CTA a la vista. Sin popups, sin autoplay con sonido, sin scroll secuestrado: la página se desplaza con normalidad y solo
se «pega» la escena durante la historia.

Alternativa sin movimiento (reducir movimiento, ahorro de datos, Safari): poster + los seis capítulos apilados, con el mismo texto y el mismo CTA.

Evitado a propósito: robots genéricos, cerebros de neón, gradientes morados, partículas, filas interminables de tarjetas iguales, mockups con texto ilegible, stock corporativo.

## Copy final

### Venta — `/comunidad/unete`

- Eyebrow: «Cohorte 1 · empieza el 22 de octubre»
- **H1 (A, se lanza):** «Aprende a construir **una web, una app y una herramienta** para tu negocio con IA»
- Alternativa B (hipótesis H1): «Pasa de “probé IA” a tener tu web, tu app y tu herramienta funcionando»
- Subtítulo: «Un programa en vivo de 4 semanas: 8 clases de 2,5 horas, plantillas y acompañamiento para aplicar la IA a tu negocio, más 60 días de comunidad.»
- CTA: «Crear cuenta para comprar» (hero, historia, ofertas, cierre y fijo móvil) · autenticado: «Ver entradas y continuar» · dueño: «Ir a mi programa» · secundario: «Prefiero que me asesoren»
- Microcopy: «Crear tu cuenta es gratis. Después podrás elegir tu entrada y pagar dentro de la plataforma.»
- Resto del texto: `lib/comunidad/landing.ts` (fuente única) y `lib/comunidad/oferta.ts`.

### Asesoría — `/comunidad/unete/asesoria`

- **H1:** «Descubre cómo **aplicar IA a tu negocio** con acompañamiento»
- Subtítulo: «Master IA 360 es un programa de pago en vivo de 4 semanas. Si no tienes claro si encaja con tu negocio o qué entrada te conviene, pide que un asesor te ayude a decidirlo.»
- CTA: «Crear cuenta y solicitar asesoría» · autenticado: «Solicitar asesoría» · secundario: «Prefiero ver el programa y comprar»
- Microcopy: «Primero creas tu cuenta. Luego podrás pedir que un asesor te ayude a elegir el programa.»
- No promete diagnóstico gratuito, llamada inmediata, cupo reservado ni tiempos de respuesta. La compra queda como enlace secundario y se dice que el programa es de pago.
  Página de campaña: `noindex`.

### Pasada de naturalidad (humanizer)

Frases cortas, verbos concretos, sin superlativos ni exclamaciones; se evitaron «transforma tu vida» y similares; los límites (qué no incluye; sin testimonios porque es la primera cohorte)
se dicen sin adornos.
