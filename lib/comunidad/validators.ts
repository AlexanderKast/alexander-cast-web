import { z } from "zod";

export const ENTRADAS = ["regular", "preventa", "vip"] as const;
export type Entrada = (typeof ENTRADAS)[number];

export const ENTRADA_LABEL: Record<Entrada, string> = {
  regular: "Regular",
  preventa: "Preventa",
  vip: "VIP",
};

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

export const alumnoSchema = z.object({
  nombre: texto(2, 120),
  email: correoSchema,
  whatsapp: whatsappSchema,
  entrada: z.enum(ENTRADAS),
  cohorte_id: z.uuid("Cohorte no válida"),
});
export type AlumnoInput = z.infer<typeof alumnoSchema>;

export const fichaSchema = z.object({
  vende: texto(3, 1000),
  a_quien: texto(3, 1000),
  quiere: texto(3, 1000),
});
export type FichaInput = z.infer<typeof fichaSchema>;

/** Compra pública: WhatsApp obligatorio (se usa para acompañar y recuperar compras a medias). */
export const compraSchema = z.object({
  nombre: texto(2, 120),
  email: correoSchema,
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{7,20}$/, "WhatsApp no válido"),
  acepto: z.literal("on", { error: "Debes aceptar el tratamiento de datos para continuar." }),
});
export type CompraInput = z.infer<typeof compraSchema>;
