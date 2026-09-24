/**
 * Constantes globales del sitio.
 *
 * La URL sale de NEXT_PUBLIC_SITE_URL para que canonical, Open Graph y
 * sitemap apunten siempre al dominio que realmente sirve el sitio. El
 * fallback es alexandercast.online, que es el dominio activo en Vercel;
 * cuando alexandercast.com quede apuntado, basta con cambiar la variable.
 */

const URL_SITIO = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.alexandercast.online";

export const site = {
  name: "Alexander Cast",
  /** Product sold on the platform ("Alexander Cast presenta IA Master Tech"). */
  producto: "IA Master Tech",
  handle: "@elmaster.ia",
  tagline: "Operar vs. Escalar",
  url: URL_SITIO,
  locale: "es-CO",
  description:
    "Tu equipo de desarrollo y automatización con entregas semanales. Software a la medida, integraciones, dashboards y agentes de IA para empresas que ya venden.",
  descriptionCorta:
    "Desarrollo y automatización para empresas que ya venden. Una entrega funcionando cada semana.",
  promesa:
    "El punto en el que tu empresa deja de depender de tareas manuales y empieza a crecer con sistemas.",
  ubicacion: "Medellín, Colombia",
  idiomas: ["Español"],
  rol: "IA Master Tech — Desarrollo & Automatización",
  fundador: [
    "IA Master Tech",
    "UGC Colombia",
    "KREOON",
    "Infiny Group",
  ],
  metricas: {
    aniosConstruyendo: "8",
  },
  // Imagen generada por app/opengraph-image.tsx. Antes apuntaba a
  // /og/alexandercast-cover.png, que no existe en public/ (daba 404).
  ogImage: "/opengraph-image",
  social: {
    instagram: {
      handle: "@elmaster.ia",
      url: "https://www.instagram.com/elmaster.ia",
    },
    // TODO(alex): confirm this is the LinkedIn profile to show in the footer.
    linkedin: {
      handle: "alexandercast",
      url: "https://www.linkedin.com/in/alexandercast",
    },
    github: {
      handle: "AlexanderKast",
      url: "https://github.com/AlexanderKast",
    },
  },
  contacto: {
    principal: "founder@kreoon.com",
    prensa: "founder@kreoon.com",
    comercial: "comercial@infinygroup.com",
    consultoria: "founder@kreoon.com",
  },
  comunidad: {
    whatsapp: "https://chat.whatsapp.com/F5QDgl4imsjBjW1KL2DhRE",
    /** Número de WhatsApp Business (Jarvis) para el flujo de /skills/gracias. */
    whatsappBusinessNumber: "573132947776",
  },
  brand: {
    colorPrimario: "#030303",
    colorAcento: "#d4af37",
    fuenteDisplay: "Playfair Display",
    fuenteTexto: "Inter",
  },
  arquetipo: ["Explorador", "Sabio"],
} as const;

export type Site = typeof site;
