import { z } from "zod";
import { PLAN_IDS } from "@/content/imt";

/*
 * Diagnostic form contract, shared by the client form and the server action.
 * Option values are the stored codes (see migration 0016_imt_diagnosticos).
 */

export const VENTAS_OPTIONS = [
  { value: "lt_50m", label: "Menos de $50M COP" },
  { value: "50m_200m", label: "$50M – $200M COP" },
  { value: "200m_1000m", label: "$200M – $1.000M COP" },
  { value: "gt_1000m", label: "Más de $1.000M COP" },
] as const;

export const EQUIPO_OPTIONS = [
  { value: "1_5", label: "1 – 5 personas" },
  { value: "6_20", label: "6 – 20 personas" },
  { value: "21_50", label: "21 – 50 personas" },
  { value: "50_plus", label: "Más de 50 personas" },
] as const;

export const INVERSION_OPTIONS = [
  { value: "lt_3_9m", label: "Menos de $3,9M" },
  { value: "3_9m_7m", label: "$3,9M – $7M" },
  { value: "7m_10m", label: "$7M – $10M" },
  { value: "gt_10m", label: "Más de $10M" },
] as const;

export const HERRAMIENTAS_OPTIONS = [
  { value: "shopify", label: "Shopify" },
  { value: "siigo", label: "Siigo" },
  { value: "hubspot", label: "HubSpot" },
  { value: "excel", label: "Excel" },
  { value: "otras", label: "Otras" },
] as const;

type Option = { readonly value: string; readonly label: string };

function values<T extends readonly Option[]>(options: T) {
  return options.map((o) => o.value) as unknown as [T[number]["value"], ...T[number]["value"][]];
}

export function labelFor(options: readonly Option[], value: string | undefined | null): string {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}

/** Empty <select> values arrive as "" — treat them as "not answered". */
const optionalEnum = <T extends [string, ...string[]]>(allowed: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), z.enum(allowed).optional());

const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max, "Es demasiado largo").optional(),
  );

export const diagnosticoSchema = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre").max(80, "El nombre es demasiado largo"),
  empresa: z.string().trim().min(2, "Escribe el nombre de tu empresa").max(120, "Es demasiado largo"),
  cargo: optionalText(80),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{7,20}$/, "Escribe un WhatsApp válido, con indicativo si es fuera de Colombia"),
  email: z.string().trim().min(1, "Escribe tu correo").email("Escribe un correo válido").max(160),
  ventas: optionalEnum(values(VENTAS_OPTIONS)),
  equipo: optionalEnum(values(EQUIPO_OPTIONS)),
  dolor: z
    .string()
    .trim()
    .min(10, "Cuéntanos un poco más (mínimo 10 caracteres)")
    .max(2000, "Es demasiado largo"),
  herramientas: z.array(z.enum(values(HERRAMIENTAS_OPTIONS))).max(HERRAMIENTAS_OPTIONS.length).default([]),
  herramientasOtras: optionalText(200),
  inversion: optionalEnum(values(INVERSION_OPTIONS)),
  plan: optionalEnum(PLAN_IDS),
  consentimiento: z.literal(true, { message: "Necesitamos tu autorización para tratar tus datos" }),
  // Honeypot: real users never fill it.
  website: z.string().max(0).optional().or(z.literal("")),
});

export type DiagnosticoInput = z.infer<typeof diagnosticoSchema>;

/** FormData → plain object in the shape the schema expects. */
export function diagnosticoFromFormData(formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : undefined;
  };
  return {
    nombre: text("nombre") ?? "",
    empresa: text("empresa") ?? "",
    cargo: text("cargo"),
    whatsapp: text("whatsapp") ?? "",
    email: text("email") ?? "",
    ventas: text("ventas"),
    equipo: text("equipo"),
    dolor: text("dolor") ?? "",
    herramientas: formData.getAll("herramientas").filter((v): v is string => typeof v === "string"),
    herramientasOtras: text("herramientasOtras"),
    inversion: text("inversion"),
    plan: text("plan"),
    consentimiento: formData.get("consentimiento") === "on",
    website: text("website") ?? "",
  };
}

export type FieldErrors = Partial<Record<keyof DiagnosticoInput | "form", string>>;

export function fieldErrorsFrom(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = (issue.path[0]?.toString() ?? "form") as keyof FieldErrors;
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
