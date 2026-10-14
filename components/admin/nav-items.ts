import {
  LayoutDashboard,
  Users,
  Wallet,
  Mail,
  CalendarCheck,
  MessageSquare,
  FileText,
  Activity,
  UserCog,
  Palette,
  Target,
  CalendarDays,
  Video,
  Share2,
  Building2,
  Briefcase,
  Sparkles,
  UserCheck,
  ClipboardList,
  KanbanSquare,
  Handshake,
  Lightbulb,
  Plug,
} from "lucide-react";
import {
  Link2,
  Star,
  Wrench,
  ExternalLink,
  Folder,
} from "lucide-react";

/**
 * Iconos que puede usar una entrada del menu. Se guardan por nombre porque
 * el menu se arma en el servidor y un componente de React no se puede pasar
 * como dato a un componente cliente.
 */
export const ICONOS = {
  LayoutDashboard,
  Users,
  Wallet,
  Mail,
  CalendarCheck,
  MessageSquare,
  FileText,
  Activity,
  UserCog,
  Palette,
  Target,
  CalendarDays,
  Video,
  Share2,
  Building2,
  Briefcase,
  Sparkles,
  UserCheck,
  ClipboardList,
  KanbanSquare,
  Handshake,
  Lightbulb,
  Plug,
  Link2,
  Star,
  Wrench,
  ExternalLink,
  Folder,
} as const;

export type NombreIcono = keyof typeof ICONOS;

/** Los que tiene sentido ofrecer al agregar un acceso propio. */
export const ICONOS_PARA_ELEGIR: NombreIcono[] = [
  "Link2",
  "Star",
  "Wrench",
  "ExternalLink",
  "Folder",
  "Sparkles",
  "FileText",
  "Users",
  "Building2",
  "Activity",
];

export type AdminNavItem = {
  label: string;
  href: string;
  icono: NombreIcono;
  /** Solo en las entradas agregadas a mano: se pueden borrar. */
  personalizado?: boolean;
};

export type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

/**
 * Menu del panel. Vivia dentro de Sidebar.tsx, que es `hidden md:flex`, asi
 * que en movil no habia ninguna forma de navegar el admin. Ahora lo comparten
 * el sidebar de escritorio y el drawer movil.
 */
export const adminNavSections: AdminNavSection[] = [
  {
    label: "Operación",
    items: [
      { label: "Dashboard", href: "/admin", icono: "LayoutDashboard" },
      { label: "Leads", href: "/admin/leads", icono: "Users" },
      { label: "Suscriptores", href: "/admin/suscriptores", icono: "Mail" },
      { label: "Pagos de planes", href: "/admin/imt-pagos", icono: "Wallet" },
      { label: "Referidos", href: "/admin/referidos", icono: "Share2" },
      { label: "Consultorías", href: "/admin/consultorias", icono: "CalendarCheck" },
      { label: "Mensajes", href: "/admin/mensajes", icono: "MessageSquare" },
      { label: "Briefs de marca", href: "/admin/briefs", icono: "ClipboardList" },
    ],
  },
  {
    label: "Interno",
    items: [
      { label: "Ideas", href: "/admin/ideas", icono: "Lightbulb" },
      { label: "Proyectos", href: "/admin/proyectos", icono: "KanbanSquare" },
      { label: "Finanzas", href: "/admin/finanzas", icono: "Wallet" },
      { label: "Sociedades", href: "/admin/sociedades", icono: "Handshake" },
    ],
  },
  {
    label: "Marca personal",
    items: [
      { label: "Manual de marca", href: "/admin/marca", icono: "Palette" },
      { label: "Estrategia", href: "/admin/estrategia", icono: "Target" },
      { label: "Plan de contenido", href: "/admin/contenido-plan", icono: "CalendarDays" },
      { label: "Guiones", href: "/admin/guiones", icono: "Video" },
      { label: "Plataformas", href: "/admin/plataformas", icono: "Share2" },
      // Antes usaba el mismo icono Building2 que "Clientes" y las dos
      // entradas se confundian entre si en el sidebar.
      { label: "Empresas", href: "/admin/empresas", icono: "Briefcase" },
      { label: "Blog", href: "/admin/contenido", icono: "FileText" },
    ],
  },
  {
    label: "Portal de clientes",
    items: [
      { label: "Clientes", href: "/admin/clientes", icono: "Building2" },
      { label: "Onboarding Clientes", href: "/clientes", icono: "UserCheck" },
    ],
  },
  {
    label: "Herramientas",
    items: [
      { label: "Content Forge", href: "/admin/content-forge", icono: "Sparkles" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Actividad", href: "/admin/actividad", icono: "Activity" },
      { label: "Equipo", href: "/admin/equipo", icono: "UserCog" },
      { label: "Conectar por MCP", href: "/admin/mcp", icono: "Plug" },
    ],
  },
];

/** Marca activo solo el match exacto o un descendiente real de la ruta. */
export function esRutaActiva(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
