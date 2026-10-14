import { z } from "zod";

/** Slug de una oferta (preventa, regular, vip, o las de futuros programas). Se valida contra la base al usarlo. */
export type Entrada = string;

const texto = (min: number, max: number) => z.string().trim().min(min).max(max);

export const correoSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Correo no válido").max(200));

/** WhatsApp opcional: dígitos, espacios, + y guiones; 7 a 20 caracteres. */
export const whatsappSchema = z
  .string()
  .trim()
  .regex(/^\+?[\d\s-]{7,20}$/, "WhatsApp no válido")
  .optional()
  .or(z.literal("").transform(() => undefined));

/**
 * Alta manual de un admin: concede un derecho (NO es una venta). Exige oferta, motivo/referencia y deja
 * constancia de quién la hizo (concedido_por). «cortesia» la distingue de una alta por pago externo.
 */
export const alumnoSchema = z.object({
  nombre: texto(2, 120),
  email: correoSchema,
  whatsapp: whatsappSchema,
  oferta_id: z.uuid("Oferta no válida"),
  motivo: texto(3, 300),
  tipo: z.enum(["admin", "cortesia"]),
});
export type AlumnoInput = z.infer<typeof alumnoSchema>;

export const fichaSchema = z.object({
  vende: texto(3, 1000),
  a_quien: texto(3, 1000),
  quiere: texto(3, 1000),
});
export type FichaInput = z.infer<typeof fichaSchema>;

/** Paso 1 de la compra: datos de contacto y consentimiento (Ley 1581). WhatsApp obligatorio: se usa para acompañar y recuperar compras a medias. */
export const leadSchema = z.object({
  nombre: texto(2, 120),
  email: correoSchema,
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{7,20}$/, "WhatsApp no válido"),
  nivel: z.enum(["preventa", "regular", "vip"]),
  privacidad: z.literal("on", { error: "Debes aceptar el tratamiento de datos para continuar." }),
});
export type LeadInput = z.infer<typeof leadSchema>;

/** Paso 2: solo la entrada elegida; el pedido se identifica por la cookie firmada, no por un id del cliente. */
export const compraSchema = z.object({
  nivel: z.enum(["preventa", "regular", "vip"]),
});
export type CompraInput = z.infer<typeof compraSchema>;

/**
 * Registro de cuenta (gratuita, sin inscripción). Privacidad obligatoria y
 * SIN preseleccionar; marketing opcional y separado: no marcarlo no bloquea nada.
 */
export const registroSchema = z.object({
  nombre: texto(2, 120),
  email: correoSchema,
  whatsapp: whatsappSchema,
  privacidad: z.literal("on", { error: "Debes aceptar el tratamiento de datos para crear tu cuenta." }),
  marketing: z.literal("on").optional(),
});
export type RegistroInput = z.infer<typeof registroSchema>;

/** Solicitud de información / lista de espera: no crea cuenta ni pedido. */
export const informacionSchema = z.object({
  nombre: texto(2, 120),
  email: correoSchema,
  whatsapp: whatsappSchema,
  privacidad: z.literal("on", { error: "Debes aceptar el tratamiento de datos para enviarnos tu solicitud." }),
  marketing: z.literal("on").optional(),
  request_key: z.uuid("Solicitud no válida"),
});
export type InformacionInput = z.infer<typeof informacionSchema>;
