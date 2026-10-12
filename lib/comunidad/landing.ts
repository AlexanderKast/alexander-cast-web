/**
 * Contenido editorial de las landings de Master IA 360 (variantes «venta» y «asesoría»).
 *
 * Igual que oferta.ts: aquí NO viven precios, fechas de venta, cupos ni derechos (salen de la base). Todo lo que se
 * afirma sale de master-ia-360/00-contexto-y-estado-actual.md o de lo ya publicado en el sitio; lo que no está
 * verificado queda fuera. Documentación y decisiones: docs/claude-landings/.
 */

export type VarianteLanding = "venta" | "asesoria";

/** Titulares razonados. Se lanza el A; el B queda como hipótesis (ver 05-medicion-y-experimentos.md). */
export const TITULARES = {
  venta: {
    A: "Aprende a construir una web, una app y una herramienta para tu negocio con IA",
    B: "Pasa de «probé IA» a tener tu web, tu app y tu herramienta funcionando",
  },
  asesoria: {
    A: "Descubre cómo aplicar IA a tu negocio con acompañamiento",
  },
} as const;

export const CTA = {
  venta: { publico: "Crear cuenta para comprar", autenticado: "Ver entradas y continuar", dueno: "Ir a mi programa" },
  asesoria: {
    publico: "Crear cuenta y solicitar asesoría",
    autenticado: "Solicitar asesoría",
    dueno: "Ir a mi programa",
  },
} as const;

export const MICROCOPY = {
  venta: "Crear tu cuenta es gratis. Después podrás elegir tu entrada y pagar dentro de la plataforma.",
  asesoria: "Primero creas tu cuenta. Luego podrás pedir que un asesor te ayude a elegir el programa.",
} as const;

/** Los tres entregables y el módulo 3D que los representa (imagen de detalle del render). */
export const ENTREGABLES = [
  {
    clave: "web",
    titulo: "Una web",
    clase: "Clase 3",
    texto: "La guía y la plantilla para publicar tu landing, aplicadas a tu propio negocio.",
    nota: "Recibes la guía y la plantilla; publicarla depende de que hagas la tarea.",
  },
  {
    clave: "app",
    titulo: "Una app",
    clase: "Clase 6",
    texto: "El prototipo de tu app y la guía para conectarle datos.",
    nota: "Recibes la guía para conectar datos a tu prototipo.",
  },
  {
    clave: "herramienta",
    titulo: "Una herramienta",
    clase: "Clase 7 y 8",
    texto: "Una herramienta interna simple (cotizador o calculadora) y tu primera tarea automatizada.",
    nota: "Cada alumno aplica lo mismo a su negocio con las plantillas.",
  },
] as const;

/** Cambio de enfoque: de probar herramientas a construir para el negocio propio. */
export const CAMBIO_ENFOQUE = [
  {
    antes: "Probar herramientas de IA una por una",
    despues: "Aplicarlas a la ficha de tu negocio, con plantillas y clases en vivo",
  },
  {
    antes: "Ejemplos genéricos que no se parecen a lo tuyo",
    despues: "Tres construcciones guiadas (web, app y herramienta) y tú replicas el proceso en tu negocio",
  },
  {
    antes: "Aprender solo y no saber si vas bien",
    despues: "Clases grabadas, recursos por clase y 60 días de comunidad con un live semanal",
  },
] as const;

/** Secuencia real del programa. No incluye un temario por semana porque aún no está definido. */
export const SECUENCIA = [
  ["Antes de la clase 1", "Subes la ficha de tu negocio a la plataforma."],
  ["Las 8 clases", "Dos por semana, de 2,5 horas, en vivo y 100% virtuales. Quedan grabadas en la plataforma."],
  ["Se construye en vivo", "El grupo vota tres veces qué negocio se construye en la clase: primero una web, luego una app y por último una herramienta."],
  ["Lo aplicas a lo tuyo", "Con las plantillas y los prompts de cada clase, haces lo mismo con tu negocio."],
  ["Demo day", "Los 10 mejores proyectos se muestran al cierre."],
  ["60 días de comunidad", "Un live semanal de preguntas y respuestas, y lo nuevo de IA: repositorios, herramientas y skills."],
] as const;

export const INSTRUCTOR = {
  nombre: "Alexander Cast",
  rol: "Estratega digital y de IA · Medellín, Colombia",
  texto:
    "Ayuda a emprendedores a dar el salto al digital y a aplicar IA en negocios reales. Es cofundador de KREOON, una plataforma con IA para crear contenido, y dirige el programa en vivo.",
  enlace: { href: "/sobre-mi", etiqueta: "Conocer más sobre Alexander" },
} as const;

/** Qué incluye y qué no. Complementa INCLUYE_TODOS (oferta.ts) con los límites explícitos. */
export const NO_INCLUYE = [
  "El plan de pago de Claude: lo necesitas activo durante el programa y su costo no está incluido.",
  "La sesión 1:1, la revisión de tu proyecto final y el seguimiento por WhatsApp: son de la entrada VIP.",
  "Resultados garantizados: se entrega la clase, la guía y la plantilla; el avance depende de que hagas el trabajo.",
] as const;

export const PARA_QUIEN = {
  si: [
    "Tienes un negocio (o un proyecto real) y quieres aplicar IA en él, no solo probar herramientas.",
    "Puedes dedicar dos clases en vivo de 2,5 horas por semana durante cuatro semanas, y revisar las grabaciones.",
    "Prefieres construir con plantillas y guía que programar desde cero.",
  ],
  no: [
    "Buscas aprender a programar: el programa es para construir con IA sin programar.",
    "No tienes ni piensas tener un negocio o proyecto al que aplicarlo.",
    "No quieres sumar el costo de un plan de pago de Claude, que no está incluido.",
  ],
} as const;

/** Preguntas por objeción (experiencia técnica, tiempo, aplicación a su negocio, inversión, acompañamiento, requisitos). */
export const FAQ_OBJECIONES = [
  ["No tengo experiencia técnica. ¿Es para mí?", "Es un programa para construir con IA sin programar, con plantillas y clases guiadas. Si ya probaste herramientas de IA y te cuesta convertirlas en algo útil para tu negocio, es el punto de partida."],
  ["¿Cuánto tiempo necesito?", "Son 8 clases en vivo de 2,5 horas, dos por semana durante cuatro semanas. Las clases quedan grabadas en la plataforma."],
  ["¿Sirve para mi tipo de negocio?", "Antes de la clase 1 subes la ficha de tu negocio y aplicas cada construcción a lo tuyo con las plantillas. Si no tienes un negocio o proyecto al que aplicarlo, probablemente no es el momento."],
  ["¿Cuánto cuesta y qué diferencia hay entre entradas?", "Los precios y la disponibilidad que ves arriba salen del sistema de compra, así que coinciden con lo que se cobra. Todas las entradas incluyen el programa completo; la VIP añade acompañamiento personal."],
  ["¿Qué acompañamiento tengo?", "Todos tienen las clases en vivo, los recursos y 60 días de comunidad con un live semanal. La sesión grupal de arranque es de la preventa y la VIP. La sesión 1:1, la revisión de tu proyecto final y 30 días de seguimiento por WhatsApp son solo de la VIP."],
  ["¿Qué necesito aparte?", "Un plan de pago de Claude activo durante el programa. Ese costo no está incluido."],
  ["¿Crear la cuenta me compromete a algo?", "No. Crear una cuenta es gratis; no es una compra ni reserva un cupo. Después eliges tu entrada y pagas dentro de la plataforma."],
] as const;

/** Preguntas de la variante de asesoría: dudas prácticas, sin prometer tiempos de respuesta. */
export const FAQ_ASESORIA = [
  ["¿La asesoría tiene costo?", "Pedirla no tiene costo ni te compromete a comprar. Master IA 360, en cambio, es un programa de pago."],
  ["¿Qué pasa cuando la solicito?", "Tu solicitud queda guardada en tu cuenta y un asesor te contacta por el canal que elijas. No te prometemos un tiempo de respuesta ni reservamos un cupo."],
  ["¿Por qué debo crear una cuenta primero?", "Para que tu solicitud quede vinculada a ti y al programa, y para que, si decides comprar, lo hagas desde tu propia cuenta, sin repetir datos."],
  ["¿Puedo comprar sin hablar con nadie?", "Sí. La compra es directa dentro de la plataforma: crea tu cuenta, elige tu entrada y paga."],
  ["¿Qué necesito aparte?", "Un plan de pago de Claude activo durante el programa. Ese costo no está incluido."],
] as const;

export const COMO_FUNCIONA_ASESORIA = [
  ["1. Creas tu cuenta", "Gratis y con tu correo verificado. No es una compra."],
  ["2. Solicitas la asesoría", "Eliges si prefieres que te contacten por WhatsApp o por correo."],
  ["3. Un asesor te contacta", "Te ayuda a decidir si el programa encaja con tu negocio y qué entrada te conviene."],
  ["4. Tú decides", "Compras dentro de tu cuenta si quieres. Pagar es siempre una decisión tuya."],
] as const;

/**
 * Historia con scroll (landing de venta): cada capítulo responde una duda de compra y se sincroniza con el video de
 * los tres módulos. Orden: deseo (resultado) → problema (piezas sueltas) → las tres construcciones → sistema + CTA.
 * `ANCLAS_HISTORIA`: fracción del video (0–1) que se ve en el centro de cada capítulo.
 */
export const HISTORIA = [
  {
    clave: "resultado",
    chip: "El resultado",
    titulo: "Tu negocio con su web, su app y su herramienta, conectadas",
    texto: "Eso es lo que se construye en Master IA 360: tres piezas que trabajan juntas, pensadas para tu negocio y no para un ejemplo de internet.",
  },
  {
    clave: "problema",
    chip: "Hoy",
    titulo: "Tienes piezas sueltas",
    texto: "Probaste herramientas de IA, pero cada una por su lado. Ninguna se conecta con tu negocio y no sabes por dónde seguir.",
  },
  {
    clave: "web",
    chip: "Clase 3 · Una web",
    titulo: "Una web que presenta tu negocio",
    texto: "Te llevas la guía y la plantilla para publicar tu landing, y la aplicas a tu propio negocio con el grupo en vivo.",
    nota: "Recibes la guía y la plantilla; publicarla depende de que hagas la tarea.",
  },
  {
    clave: "app",
    chip: "Clase 6 · Una app",
    titulo: "Una app que organiza lo que haces",
    texto: "Diseñas el prototipo de tu app y aprendes a conectarle datos con la guía de la clase.",
    nota: "Recibes la guía para conectar datos a tu prototipo.",
  },
  {
    clave: "herramienta",
    chip: "Clases 7 y 8 · Una herramienta",
    titulo: "Una herramienta que trabaja por ti",
    texto: "Armas una herramienta interna simple (un cotizador o una calculadora) y dejas funcionando tu primera tarea automatizada.",
    nota: "Cada alumno aplica lo mismo a su negocio con las plantillas.",
  },
  {
    clave: "sistema",
    chip: "El camino",
    titulo: "Un sistema que funciona, con acompañamiento",
    texto: "8 clases en vivo grabadas, plantillas y recursos, y 60 días de comunidad con un live semanal. Empieza por crear tu cuenta, que es gratis.",
  },
] as const;

export const ANCLAS_HISTORIA = [0.03, 0.3, 0.5, 0.62, 0.74, 0.97];

/** Cifras reales del programa (se animan al entrar en pantalla). */
export const CIFRAS = [
  { valor: 8, decimales: 0, etiqueta: "clases en vivo" },
  { valor: 2.5, decimales: 1, etiqueta: "horas cada una" },
  { valor: 4, decimales: 0, etiqueta: "semanas" },
  { valor: 60, decimales: 0, etiqueta: "días de comunidad" },
] as const;
