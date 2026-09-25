import { z } from 'zod';

// Upper bounds so a public submit cannot push huge payloads to Drive/Groq.
const TEXT_MAX = 5_000;
const ITEM_MAX = 500;
const LIST_MAX = 50;

export const brandIntakeSchema = z.object({
  tipo: z.enum(['personal', 'producto', 'servicio']),
  nombreMarca: z.string().min(2, 'Nombre muy corto').max(TEXT_MAX),
  expertiseDiferenciador: z.string().min(10, 'Sé más específico').max(TEXT_MAX),
  anosExperiencia: z.number().min(0).max(50),
  ubicacionGeografica: z.string().min(3).max(TEXT_MAX),
  idiomas: z.array(z.string().max(ITEM_MAX)).min(1, 'Agrega al menos un idioma').max(LIST_MAX),
  industriaNicho: z.string().min(3).max(TEXT_MAX),
  perfilDemografico: z.string().min(20).max(TEXT_MAX),
  problemaPrincipal: z.string().min(20).max(TEXT_MAX),
  resultadoDeseado: z.string().min(20).max(TEXT_MAX),
  nivelSofisticacion: z.number().min(0).max(5),
  objecionesPrincipales: z.array(z.string().max(ITEM_MAX)).min(3).max(5),
  competenciaDirecta: z.array(z.string().max(ITEM_MAX)).min(1).max(LIST_MAX),
  ventajaCompetitiva: z.string().min(20).max(TEXT_MAX),
  queOfrece: z.string().min(20).max(TEXT_MAX),
  promesaRealista: z.string().min(20).max(TEXT_MAX),
  precioInversion: z.string().min(5).max(TEXT_MAX),
  formatoEntrega: z.string().min(10).max(TEXT_MAX),
  garantia: z.string().max(TEXT_MAX).optional(),
  noPromete: z.string().min(10).max(TEXT_MAX),
  estiloComuncacional: z.string().min(10).max(TEXT_MAX),
  expresionesNaturales: z.array(z.string().max(ITEM_MAX)).min(15, 'Necesitamos mínimo 15 expresiones').max(LIST_MAX),
  prohibiciones: z.array(z.string().max(ITEM_MAX)).min(10, 'Necesitamos mínimo 10 prohibiciones').max(LIST_MAX),
  nivelFormalidad: z.number().min(1).max(10),
  usoHumor: z.enum(['Alto', 'Moderado', 'Bajo', 'Sin humor']),
  regionalismos: z.string().max(TEXT_MAX).optional(),
  temasSensibles: z.string().max(TEXT_MAX).optional(),
  pilares: z
    .array(
      z.object({
        nombre: z.string().min(3).max(TEXT_MAX),
        porcentaje: z.number().min(5).max(60),
      })
    )
    .min(3)
    .max(5)
    .refine((p) => p.reduce((s, x) => s + x.porcentaje, 0) === 100, {
      message: 'Los pilares deben sumar 100%',
    }),
  creenciasFundamentales: z.array(z.string().max(ITEM_MAX)).min(3).max(7),
  queRechaza: z.array(z.string().max(ITEM_MAX)).min(2).max(5),
  limitesEticos: z.array(z.string().max(ITEM_MAX)).min(2).max(5),
  propositoMarca: z.string().min(30).max(TEXT_MAX),
  historiaOrigen: z.string().max(TEXT_MAX).optional(),
  historiaBatallas: z.string().max(TEXT_MAX).optional(),
  historiaLogros: z.string().max(TEXT_MAX).optional(),
  mensajeCentral: z.string().min(20, 'El mensaje central debe tener mínimo 20 caracteres').max(TEXT_MAX),
  comoPierciben: z.string().max(TEXT_MAX).optional(),
  costoNoActuar: z.string().min(20, 'Describe el costo de no actuar').max(TEXT_MAX),
  errorPrincipal: z.string().min(20, 'Describe el error principal del cliente').max(TEXT_MAX),
  aQuienNoAyudo: z.string().min(10, 'Define a quién no puedes ayudar').max(TEXT_MAX),
  resultadosClientes: z.string().max(TEXT_MAX).optional(),
  figurasReferencia: z.object({
    heroInfluencer: z.string().max(TEXT_MAX),
    competidoresDirectos: z.array(z.string().max(ITEM_MAX)).max(LIST_MAX),
    creadoresIndustria: z.array(z.string().max(ITEM_MAX)).max(LIST_MAX),
  }).optional(),
  objetivoPrincipal: z.enum(['awareness', 'leads', 'ventas', 'comunidad']),
  kpiCritico: z.string().min(5).max(TEXT_MAX),
  frecuenciaContenido: z.string().min(5).max(TEXT_MAX),
  plataformas: z.array(z.string().max(ITEM_MAX)).min(1).max(LIST_MAX),
  recursosDisponibles: z.object({
    tiempoPorSemana: z.number().min(1).max(168),
    presupuesto: z.string().max(TEXT_MAX).optional(),
    equipo: z.string().max(TEXT_MAX).optional(),
  }),
  timeline: z.string().min(5).max(TEXT_MAX),
  productosSecundarios: z.array(z.string().max(ITEM_MAX)).max(LIST_MAX).optional(),
  colaboraciones: z.array(z.string().max(ITEM_MAX)).max(LIST_MAX).optional(),
  temporadasEventos: z.array(z.string().max(ITEM_MAX)).max(LIST_MAX).optional(),
  restricciones: z.array(z.string().max(ITEM_MAX)).max(LIST_MAX).optional(),
  integracionesNecesarias: z.array(z.string().max(ITEM_MAX)).max(LIST_MAX).optional(),
});

export type BrandIntakeFormData = z.infer<typeof brandIntakeSchema>;
