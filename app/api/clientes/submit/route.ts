import { NextRequest, NextResponse } from 'next/server';
import { brandIntakeSchema } from '@/lib/clientes/form-schema';
import { uploadToGoogleDrive } from '@/lib/clientes/google-drive';
import { clientIp, formLimiter } from '@/lib/rate-limit';
import { isSameOriginStrict } from '@/lib/same-origin';

/** 200 KB: a complete brand intake weighs a few KB. */
const MAX_BODY = 200_000;

export async function POST(request: NextRequest) {
  if (!isSameOriginStrict(request.headers)) {
    return NextResponse.json({ success: false, error: 'Origen no permitido.' }, { status: 403 });
  }

  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY) {
    return NextResponse.json(
      { success: false, error: 'El envío es demasiado grande.' },
      { status: 413 },
    );
  }

  const limit = await formLimiter(`cl-submit:${clientIp(request.headers, '0.0.0.0')}`);
  if (!limit.success) {
    return NextResponse.json(
      { success: false, error: 'Demasiados envíos seguidos. Intenta de nuevo en unos minutos.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) {
      return NextResponse.json(
        { success: false, error: 'El envío es demasiado grande.' },
        { status: 413 },
      );
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ success: false, error: 'Envío inválido.' }, { status: 400 });
  }

  const parsed = brandIntakeSchema.safeParse(body);
  if (!parsed.success) {
    console.error('[clientes/submit] validation:', parsed.error.issues.map((i) => i.path.join('.')));
    return NextResponse.json(
      { success: false, error: 'Revisa los campos del formulario e intenta de nuevo.' },
      { status: 400 },
    );
  }

  try {
    const result = await uploadToGoogleDrive({
      ...parsed.data,
      submittedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[clientes/submit]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'No pudimos guardar el formulario. Intenta de nuevo.' },
      { status: 500 },
    );
  }
}
