import { createHmac } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { clientIp, formLimiter } from '@/lib/rate-limit';
import { hostDeLaBase } from '@/lib/supabase/server';
import { supabaseBrief } from '@/lib/brief/cliente-publico';
import { resolverCliente, validarRespuestas } from '@/lib/brief/schema';

/**
 * Recepcion del brief publico.
 *
 * Defensas, en orden: mismo origen -> tamano del cuerpo -> forma del JSON
 * (zod) -> honeypot -> tiempo minimo en pagina -> rate limit por IP ->
 * validacion campo por campo contra el cuestionario. Recien despues se
 * escribe en la base con la service role key.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 400 KB: el cuestionario completo pesa ~40 KB. */
const MAX_BODY = 400_000;
const SEGUNDOS_MINIMOS = 10;

const envioSchema = z.object({
  cliente: z.string().min(1).max(60),
  sitioWeb: z.string().max(200).optional().default(''),
  msEnPagina: z.number().int().min(0).max(86_400_000).optional().default(0),
  respuestas: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
});

function ipDe(req: NextRequest): string {
  // cf-connecting-ip is not trusted: without Cloudflare the client sets it.
  return clientIp(req.headers, '0.0.0.0');
}

/** La IP nunca se guarda en claro. */
function hashIp(ip: string): string {
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'sin-clave';
  return createHmac('sha256', clave).update(ip).digest('hex');
}

function mismoOrigen(req: NextRequest): boolean {
  const host = req.headers.get('host');
  const origen = req.headers.get('origin') ?? req.headers.get('referer');
  if (!host || !origen) return true; // sin cabeceras no hay nada que comparar
  try {
    return new URL(origen).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!mismoOrigen(req)) {
    return NextResponse.json({ ok: false, error: 'Origen no permitido.' }, { status: 403 });
  }

  const declarado = Number(req.headers.get('content-length') ?? 0);
  if (declarado > MAX_BODY) {
    return NextResponse.json({ ok: false, error: 'El envio es demasiado grande.' }, { status: 413 });
  }

  let crudo: unknown;
  try {
    const texto = await req.text();
    if (texto.length > MAX_BODY) {
      return NextResponse.json(
        { ok: false, error: 'El envio es demasiado grande.' },
        { status: 413 },
      );
    }
    crudo = JSON.parse(texto);
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON invalido.' }, { status: 400 });
  }

  const parseado = envioSchema.safeParse(crudo);
  if (!parseado.success) {
    return NextResponse.json({ ok: false, error: 'Formato de envio invalido.' }, { status: 400 });
  }
  const envio = parseado.data;

  // Trampa para bots: se responde ok para no darles pistas, pero no se guarda.
  if (envio.sitioWeb.trim() !== '') {
    return NextResponse.json({ ok: true, id: null });
  }

  if (envio.msEnPagina > 0 && envio.msEnPagina < SEGUNDOS_MINIMOS * 1000) {
    return NextResponse.json(
      { ok: false, error: 'El envio llego demasiado rapido. Intentalo de nuevo.' },
      { status: 422 },
    );
  }

  const ip = ipDe(req);
  const limite = await formLimiter(`brief:${ip}`);
  if (!limite.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Se alcanzo el limite de envios. Proba en un rato o escribinos por WhatsApp.',
      },
      { status: 429 },
    );
  }

  const cliente = resolverCliente(envio.cliente);
  const resultado = validarRespuestas(envio.respuestas, cliente.sector, cliente.marca);

  if (resultado.errores.length > 0) {
    return NextResponse.json(
      { ok: false, error: 'Revisa los datos marcados.', errores: resultado.errores },
      { status: 422 },
    );
  }
  if (resultado.respondidas === 0) {
    return NextResponse.json({ ok: false, error: 'No llego ninguna respuesta.' }, { status: 422 });
  }

  try {
    const supabase = supabaseBrief();
    // El id lo pone el servidor: la respuesta al visitante no necesita
    // volver a leer la fila recien insertada.
    const idEnvio = crypto.randomUUID();

    const { error: errorCabecera } = await supabase
      .from('brief_submissions')
      .insert({
        id: idEnvio,
        cliente: cliente.slug,
        marca: cliente.marca,
        sector: cliente.sector,
        contacto_nombre: (resultado.valores.contacto_nombre ?? '').slice(0, 160),
        contacto_email: (resultado.valores.contacto_correo ?? '').slice(0, 190),
        contacto_tel: (resultado.valores.contacto_whatsapp ?? '').slice(0, 60),
        empresa: (resultado.valores.empresa ?? '').slice(0, 190),
        completado_pct: resultado.pct,
        respondidas: resultado.respondidas,
        total_campos: resultado.total,
        estado: 'nuevo',
        payload: { cliente: cliente.slug, marca: cliente.marca, valores: resultado.valores },
        ip_hash: hashIp(ip),
        user_agent: (req.headers.get('user-agent') ?? '').slice(0, 255),
      });

    if (errorCabecera) {
      throw new Error(errorCabecera.message);
    }

    const filas = Object.entries(resultado.valores).map(([campoId, valor]) => ({
      submission_id: idEnvio,
      campo_id: campoId.slice(0, 60),
      valor,
    }));

    if (filas.length > 0) {
      const { error: errorRespuestas } = await supabase.from('brief_answers').insert(filas);
      // El payload completo ya quedo guardado en la cabecera: si fallan las
      // filas sueltas no se pierde informacion, pero queda registrado.
      if (errorRespuestas) console.error('[brief] answers:', errorRespuestas.message);
    }

    return NextResponse.json({ ok: true, id: idEnvio });
  } catch (error) {
    const detalle = error instanceof Error ? error.message : 'desconocido';
    // El host ayuda a distinguir 'la base no responde' de 'apunta a otro lado'.
    console.error('[brief] submit:', detalle, '| base:', hostDeLaBase());
    return NextResponse.json(
      { ok: false, error: 'No pudimos guardar el envio. Intentalo de nuevo en un momento.' },
      { status: 500 },
    );
  }
}
