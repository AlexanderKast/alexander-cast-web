import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { predictSuggestions } from '@/lib/clientes/groq';
import { clientIp, formLimiter } from '@/lib/rate-limit';
import { isSameOriginStrict } from '@/lib/same-origin';

/** 100 KB: the context sent for a suggestion is a handful of short fields. */
const MAX_BODY = 100_000;

const contextValue = z.union([
  z.string().max(5_000),
  z.array(z.string().max(1_000)).max(100),
  z.number(),
]);

const predictSchema = z.object({
  campo: z.string().max(60),
  contexto: z.record(z.string().max(100), contextValue),
});

const CAMPO_CONFIGS: Record<string, { instruccion: string; n: number }> = {
  problemaPrincipal: {
    instruccion: 'Sugiere posibles problemas que enfrenta la audiencia de esa industria/nicho. Cada sugerencia debe comenzar con un verbo o con "No saber", "Falta de", "Dificultad para".',
    n: 3,
  },
  ventajaCompetitiva: {
    instruccion: 'Sugiere posibles diferenciadores frente a la competencia. Cada sugerencia debe ser un ARRANQUE de frase que el usuario pueda completar, como "La diferencia está en cómo..." o "A diferencia de otros...".',
    n: 2,
  },
  expresionesNaturales: {
    instruccion: 'Sugiere expresiones o frases que podrían sonar auténticas a esta marca, coherentes con su estilo comunicacional. Deben ser coloquiales o características de la voz ya definida.',
    n: 3,
  },
  creenciasFundamentales: {
    instruccion: 'Sugiere posibles creencias o paradigmas que esta marca podría defender. Cada sugerencia debe ser el INICIO de una creencia, no la creencia completa — algo como "Creemos que..." o "La verdad es que...".',
    n: 2,
  },
  mensajeCentral: {
    instruccion: 'Sugiere posibles mensajes centrales basados en los pilares y creencias del usuario. Cada uno debe ser el INICIO de una idea, no el mensaje completo.',
    n: 2,
  },
};

export async function POST(request: NextRequest) {
  if (!isSameOriginStrict(request.headers)) {
    return NextResponse.json({ sugerencias: [], error: 'Origen no permitido.' }, { status: 403 });
  }

  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY) {
    return NextResponse.json({ sugerencias: [], error: 'El envío es demasiado grande.' }, { status: 413 });
  }

  const limit = await formLimiter(`cl-predict:${clientIp(request.headers, '0.0.0.0')}`);
  if (!limit.success) {
    return NextResponse.json(
      { sugerencias: [], error: 'Demasiadas solicitudes. Probá en un rato.' },
      { status: 429 },
    );
  }

  try {
    const text = await request.text();
    if (text.length > MAX_BODY) {
      return NextResponse.json({ sugerencias: [], error: 'El envío es demasiado grande.' }, { status: 413 });
    }
    const parsed = predictSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return NextResponse.json({ sugerencias: [] });
    const { campo, contexto } = parsed.data;

    const config = Object.hasOwn(CAMPO_CONFIGS, campo) ? CAMPO_CONFIGS[campo] : undefined;
    if (!config) return NextResponse.json({ sugerencias: [] });

    const sugerencias = await predictSuggestions({
      campo,
      instruccion: config.instruccion,
      contexto,
      n: config.n,
    });

    return NextResponse.json({ sugerencias });
  } catch (error) {
    console.error('[clientes/predict]', error instanceof Error ? error.message : error);
    return NextResponse.json({ sugerencias: [] });
  }
}
