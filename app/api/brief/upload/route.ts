import { NextResponse, type NextRequest } from 'next/server';
import { supabaseBrief } from '@/lib/brief/cliente-publico';
import { clientIp, formLimiter } from '@/lib/rate-limit';
import { isSameOriginStrict } from '@/lib/same-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Lo que tiene sentido para un logo, una paleta o una ficha de marca.
 * SVG and PostScript are not accepted: SVG can carry <script> (stored XSS on
 * the public bucket origin) and PostScript is an executable format.
 */
const TIPOS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
};

/** Content-Type stored in the bucket, derived from the verified extension. */
const CONTENT_TYPE: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
  zip: 'application/zip',
};

function empiezaCon(bytes: Uint8Array, firma: number[], desde = 0): boolean {
  if (bytes.length < desde + firma.length) return false;
  return firma.every((b, i) => bytes[desde + i] === b);
}

/** Checks the file's magic bytes: the client-declared MIME is not trusted. */
function firmaValida(extension: string, bytes: Uint8Array): boolean {
  switch (extension) {
    case 'png':
      return empiezaCon(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'jpg':
      return empiezaCon(bytes, [0xff, 0xd8, 0xff]);
    case 'webp':
      // "RIFF" <size> "WEBP"
      return (
        empiezaCon(bytes, [0x52, 0x49, 0x46, 0x46]) &&
        empiezaCon(bytes, [0x57, 0x45, 0x42, 0x50], 8)
      );
    case 'gif':
      // "GIF87a" | "GIF89a"
      return (
        empiezaCon(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
        empiezaCon(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
      );
    case 'pdf':
      // "%PDF-"
      return empiezaCon(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
    case 'zip':
      // "PK\x03\x04" (regular archive) | "PK\x05\x06" (empty archive)
      return (
        empiezaCon(bytes, [0x50, 0x4b, 0x03, 0x04]) ||
        empiezaCon(bytes, [0x50, 0x4b, 0x05, 0x06])
      );
    default:
      return false;
  }
}

function ipDe(req: NextRequest): string {
  return clientIp(req.headers, '0.0.0.0');
}

export async function POST(req: NextRequest) {
  // Mismo origen: el formulario es la unica pagina que sube archivos.
  // A missing Origin/Referer is rejected too (curl used to bypass the check).
  if (!isSameOriginStrict(req.headers)) {
    return NextResponse.json({ ok: false, error: 'Origen no permitido.' }, { status: 403 });
  }

  const limite = await formLimiter(`brief-upload:${ipDe(req)}`);
  if (!limite.success) {
    return NextResponse.json(
      { ok: false, error: 'Demasiadas subidas seguidas. Probá en un rato.' },
      { status: 429 },
    );
  }

  let archivo: File | null = null;
  try {
    const form = await req.formData();
    const dato = form.get('archivo');
    archivo = dato instanceof File ? dato : null;
  } catch {
    return NextResponse.json({ ok: false, error: 'Envío inválido.' }, { status: 400 });
  }

  if (!archivo) {
    return NextResponse.json({ ok: false, error: 'No llegó ningún archivo.' }, { status: 400 });
  }
  if (archivo.size === 0 || archivo.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: 'El archivo debe pesar menos de 10 MB.' },
      { status: 413 },
    );
  }

  const extension = TIPOS[archivo.type];
  if (!extension) {
    return NextResponse.json(
      { ok: false, error: 'Formato no admitido. Usá PNG, JPG, WEBP, GIF, PDF o ZIP.' },
      { status: 415 },
    );
  }

  const contenido = await archivo.arrayBuffer();
  const cabecera = new Uint8Array(contenido, 0, Math.min(16, contenido.byteLength));
  if (!firmaValida(extension, cabecera)) {
    return NextResponse.json(
      { ok: false, error: 'El archivo no coincide con su formato. Usá PNG, JPG, WEBP, GIF, PDF o ZIP.' },
      { status: 415 },
    );
  }

  // El nombre lo pone el servidor: el del visitante no se usa para la ruta.
  const nombre = `${crypto.randomUUID()}.${extension}`;
  const ruta = `${new Date().toISOString().slice(0, 7)}/${nombre}`;

  try {
    const supabase = supabaseBrief();
    // TODO(security): make the 'brief' bucket private and serve signed URLs.
    // Needs a storage migration, so the public URL behavior is kept for now.
    const { error } = await supabase.storage
      .from('brief')
      .upload(ruta, contenido, {
        contentType: CONTENT_TYPE[extension],
        upsert: false,
      });

    if (error) {
      console.error('[brief/upload]', error.message);
      return NextResponse.json(
        { ok: false, error: 'No pudimos guardar el archivo. Probá de nuevo.' },
        { status: 500 },
      );
    }

    const { data } = supabase.storage.from('brief').getPublicUrl(ruta);
    return NextResponse.json({ ok: true, url: data.publicUrl, nombre: archivo.name });
  } catch (e) {
    console.error('[brief/upload]', e);
    return NextResponse.json(
      { ok: false, error: 'No pudimos guardar el archivo. Probá de nuevo.' },
      { status: 500 },
    );
  }
}
