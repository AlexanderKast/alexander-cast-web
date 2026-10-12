/**
 * Reglas de la venta asistida (lógica pura, sin IO). La base las refuerza (trigger de «ganada» y RLS);
 * aquí viven los permisos y transiciones que usan las acciones del servidor.
 *
 * Principios: el comercial gestiona SOLO sus oportunidades asignadas, no concede roles, no suplanta
 * usuarios y no marca pagos. «Ganada» es consecuencia de un pago confirmado, nunca un cambio manual.
 */

export type EstadoOportunidad = "nueva" | "asignada" | "contactada" | "propuesta" | "pendiente_pago" | "ganada" | "perdida";
export type RolPlataforma = "alumno" | "moderador" | "admin" | "comercial";

export interface Actor {
  userId: string;
  rol: RolPlataforma;
}

export interface OportunidadLite {
  userId: string; // la cuenta del cliente
  asignadoA: string | null;
  estado: EstadoOportunidad;
}

/** Etiquetas visibles de cada estado. */
export const ETIQUETA_ESTADO: Record<EstadoOportunidad, string> = {
  nueva: "Nueva",
  asignada: "Asignada",
  contactada: "Contactada",
  propuesta: "Propuesta enviada",
  pendiente_pago: "Pendiente de pago",
  ganada: "Ganada",
  perdida: "Perdida",
};

export const ABIERTAS: EstadoOportunidad[] = ["nueva", "asignada", "contactada", "propuesta", "pendiente_pago"];

/** Ve la oportunidad: el propio cliente, el comercial asignado y el admin. */
export function puedeVer(actor: Actor, o: OportunidadLite): boolean {
  return actor.rol === "admin" || o.userId === actor.userId || (actor.rol === "comercial" && o.asignadoA === actor.userId);
}

/** Gestiona (notas, estado, pedido): el admin y el comercial ASIGNADO. Ni el cliente ni otro comercial. */
export function puedeGestionar(actor: Actor, o: OportunidadLite): boolean {
  return actor.rol === "admin" || (actor.rol === "comercial" && o.asignadoA === actor.userId);
}

/** Asignar comercial: solo admin. Un comercial no se asigna ni reasigna oportunidades. */
export const puedeAsignar = (actor: Actor): boolean => actor.rol === "admin";

/** Pasos manuales válidos. «ganada» NO aparece: solo la confirma el sistema al pagarse el pedido. */
export const TRANSICIONES_MANUALES: Record<EstadoOportunidad, EstadoOportunidad[]> = {
  nueva: ["asignada", "contactada", "perdida"],
  asignada: ["contactada", "propuesta", "perdida"],
  contactada: ["propuesta", "pendiente_pago", "perdida"],
  propuesta: ["contactada", "pendiente_pago", "perdida"],
  pendiente_pago: ["propuesta", "perdida"],
  ganada: [],
  perdida: [],
};

export type ResultadoTransicion = { ok: true } | { ok: false; motivo: string };

export function transicionManual(actor: Actor, o: OportunidadLite, destino: EstadoOportunidad): ResultadoTransicion {
  if (destino === "ganada") {
    return { ok: false, motivo: "Una oportunidad solo queda ganada cuando se confirma el pago del pedido." };
  }
  if (!puedeGestionar(actor, o)) return { ok: false, motivo: "No puedes gestionar esta oportunidad." };
  if (destino === "asignada" && !puedeAsignar(actor)) {
    return { ok: false, motivo: "Solo un administrador asigna oportunidades." };
  }
  if (!TRANSICIONES_MANUALES[o.estado].includes(destino)) {
    return { ok: false, motivo: `No se puede pasar de «${o.estado}» a «${destino}».` };
  }
  return { ok: true };
}

/** Crear el pedido de la oportunidad: quien la gestiona, mientras siga abierta y tenga oferta. */
export function puedeCrearPedido(actor: Actor, o: OportunidadLite & { ofertaId: string | null }): ResultadoTransicion {
  if (!puedeGestionar(actor, o)) return { ok: false, motivo: "No puedes gestionar esta oportunidad." };
  if (!ABIERTAS.includes(o.estado)) return { ok: false, motivo: "La oportunidad ya está cerrada." };
  if (!o.ofertaId) return { ok: false, motivo: "Elige primero la oferta que se le va a proponer." };
  return { ok: true };
}
