import type { NextConfig } from "next";
import path from "node:path";

/**
 * Cabeceras de seguridad. Antes solo llegaba el HSTS que pone Vercel:
 * faltaban clickjacking, sniffing, referrer y permisos de dispositivo.
 *
 * No se agrega Content-Security-Policy todavia: el sitio usa estilos en
 * linea y scripts de terceros (Vercel Analytics, Cal.com, tsparticles) y
 * una CSP mal armada rompe la pagina en silencio. Va aparte, arrancando
 * con Content-Security-Policy-Report-Only.
 */
const cabecerasSeguridad = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  /**
   * El panel del brief vivia en /panel, con su propio login contra otra
   * base. Ahora las respuestas se ven en /admin/briefs con la misma sesion
   * del panel. Los enlaces viejos siguen llevando al lugar correcto.
   */
  async redirects() {
    return [
      { source: "/panel", destination: "/admin/briefs", permanent: false },
      { source: "/panel/login", destination: "/admin/login", permanent: false },
      { source: "/panel/:id", destination: "/admin/briefs/:id", permanent: false },

      /*
       * IA Master Tech: the consulting pages are retired. 301 (not Next's
       * default 308 for `permanent`) as requested for SEO continuity.
       */
      { source: "/servicios", destination: "/#planes", statusCode: 301 },
      { source: "/consultoria", destination: "/#planes", statusCode: 301 },
      { source: "/sobre-mi", destination: "/nosotros", statusCode: 301 },
      { source: "/contacto", destination: "/diagnostico", statusCode: 301 },
      { source: "/podcast", destination: "/", statusCode: 301 },
      { source: "/recursos", destination: "/", statusCode: 301 },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: cabecerasSeguridad }];
  },
};

export default nextConfig;
