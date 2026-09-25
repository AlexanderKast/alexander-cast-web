import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { resumirTexto, transcribirIdea } from "@/lib/ideas/gemini";
import { normalizarCodigo } from "@/lib/ideas/tipos";
import {
  audioDe,
  descargarArchivo,
  escapar,
  nombreDe,
  responder,
  type MensajeTelegram,
  type UpdateTelegram,
} from "@/lib/telegram/api";
import { urlDelSitio } from "@/lib/sitio";
import { createSupabaseServiceRole } from "@/lib/supabase/server";

/**
 * El bot de ideas.
 *
 * Alguien manda su idea — hablada o escrita — y queda ordenada en la bandeja
 * del panel. Nada mas: ni menus, ni conversacion, ni preguntarle a que proyecto
 * va. Cualquier paso extra es la friccion que hace que la idea se pierda.
 *
 * El bot es una puerta abierta a internet, asi que hay dos cerrojos:
 * el secreto del webhook (que el POST venga de Telegram) y el codigo de
 * invitacion (que la persona este autorizada).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Transcribir un audio de varios minutos no entra en el default de 10s.
export const maxDuration = 60;

const AYUDA = [
  "Mandame tu idea y la guardo en la bandeja del panel, con título, resumen y etiquetas.",
  "",
  "Da igual cómo: <b>nota de voz</b> o <b>escrita</b>. Las dos quedan igual de ordenadas.",
].join("\n");

/**
 * Telegram reintenta un update si no le contestamos rapido, y transcribir
 * tarda. La ruta del audio sale del file_id, asi que el reintento cae en la
 * misma ruta y se puede cortar antes de crear la idea dos veces.
 */
function rutaAudio(chatId: number, fileId: string): string {
  const hash = createHash("sha256").update(fileId).digest("hex").slice(0, 16);
  return `${chatId}/${hash}.oga`;
}

interface Remitente {
  chatId: number;
  adminUserId: string | null;
  nombre: string;
}

/** Quien es, si ya canjeo un codigo. */
async function remitenteAutorizado(chatId: number): Promise<Remitente | null> {
  const { data } = await createSupabaseServiceRole()
    .from("int_telegram_usuarios")
    .select("chat_id, admin_user_id, nombre, activo")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (!data || !data.activo) return null;

  return {
    chatId,
    adminUserId: (data.admin_user_id as string | null) ?? null,
    nombre: (data.nombre as string) || "Alguien por Telegram",
  };
}

/**
 * Canjea un codigo. Se cobra el uso antes de dar el alta: si dos personas
 * mandan el mismo codigo a la vez, el contador decide y no entran las dos.
 */
async function canjear(msg: MensajeTelegram, crudo: string): Promise<void> {
  const chatId = msg.chat.id;
  const codigo = normalizarCodigo(crudo);
  const supabase = createSupabaseServiceRole();

  const { data: fila } = await supabase
    .from("int_telegram_codigos")
    .select("id, codigo, admin_user_id, usos, usos_max, expira_at, activo")
    .eq("codigo", codigo)
    .maybeSingle();

  const vencido =
    fila?.expira_at != null && new Date(fila.expira_at as string) < new Date();

  if (
    !fila ||
    !fila.activo ||
    vencido ||
    (fila.usos as number) >= (fila.usos_max as number)
  ) {
    await responder(
      chatId,
      "Ese código no sirve. Pedile uno nuevo a quien te invitó.",
    );
    return;
  }

  // Solo avanza si el contador sigue como lo leimos: es el candado contra
  // dos canjes simultaneos del mismo codigo de un uso.
  const { data: cobrado } = await supabase
    .from("int_telegram_codigos")
    .update({ usos: (fila.usos as number) + 1 })
    .eq("id", fila.id)
    .eq("usos", fila.usos as number)
    .select("id")
    .maybeSingle();

  if (!cobrado) {
    await responder(chatId, "Ese código ya se usó. Pedí uno nuevo.");
    return;
  }

  const from = msg.from;
  const { error } = await supabase.from("int_telegram_usuarios").upsert(
    {
      chat_id: chatId,
      admin_user_id: fila.admin_user_id,
      nombre: nombreDe(msg),
      username: from?.username ?? "",
      codigo_usado: codigo,
      activo: true,
    },
    { onConflict: "chat_id" },
  );

  if (error) {
    console.error("[telegram] alta:", error.message);
    await responder(chatId, "Algo falló al darte de alta. Probá de nuevo.");
    return;
  }

  await responder(chatId, `Listo, ${escapar(nombreDe(msg))}. ${AYUDA}`);
}

/** Nota de voz -> idea. */
async function guardarAudio(msg: MensajeTelegram, quien: Remitente): Promise<void> {
  const audio = audioDe(msg);
  if (!audio) return;

  const chatId = quien.chatId;
  const supabase = createSupabaseServiceRole();
  const ruta = rutaAudio(chatId, audio.file_id);

  const { data: repetida } = await supabase
    .from("int_ideas")
    .select("id")
    .eq("audio_path", ruta)
    .maybeSingle();

  // Es el reintento de Telegram sobre un audio que ya entro.
  if (repetida) return;

  await responder(chatId, "🎧 Escuchando tu idea…");

  const bytes = await descargarArchivo(audio.file_id);
  if (!bytes) {
    await responder(chatId, "No pude bajar el audio. Mandalo de nuevo.");
    return;
  }

  const mime = audio.mime_type || "audio/ogg";
  const resultado = await transcribirIdea(bytes, mime);

  if (!resultado.ok) {
    await responder(chatId, `No pude procesarlo: ${escapar(resultado.error)}`);
    return;
  }

  // El audio se guarda igual: la transcripcion puede haber entendido mal y
  // la voz original es la unica prueba de lo que se dijo.
  const { error: errorAudio } = await supabase.storage
    .from("ideas-audio")
    .upload(ruta, bytes, { contentType: mime, upsert: true });

  if (errorAudio) console.error("[telegram] audio:", errorAudio.message);

  const { idea } = resultado;
  const { data, error } = await supabase
    .from("int_ideas")
    .insert({
      titulo: idea.titulo,
      resumen: idea.resumen,
      transcripcion: idea.transcripcion,
      tags: idea.tags,
      origen: "telegram",
      audio_path: errorAudio ? "" : ruta,
      audio_seg: audio.duration ?? 0,
      autor_id: quien.adminUserId,
      autor_nombre: quien.nombre,
      telegram_chat_id: chatId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[telegram] insert idea:", error.message);
    await responder(
      chatId,
      "Se transcribió bien pero no pude guardarla. Probá de nuevo.",
    );
    return;
  }

  await supabase
    .from("int_telegram_usuarios")
    .update({ ultima_idea_at: new Date().toISOString() })
    .eq("chat_id", chatId);

  const sitio = urlDelSitio();
  const link = sitio ? `\n\n${sitio}/admin/ideas/${data.id}` : "";
  const tags = idea.tags.length ? `\n🏷 ${escapar(idea.tags.join(", "))}` : "";

  await responder(
    chatId,
    `✅ <b>${escapar(idea.titulo)}</b>\n\n${escapar(idea.resumen)}${tags}${link}`,
  );
}

/**
 * Idea escrita. Pasa por lo mismo que un audio: titulo, resumen y tags.
 *
 * Antes el texto se guardaba crudo, con la primera linea de titulo. Eso hacia
 * que escribir en vez de hablar dejara una idea peor ordenada — un castigo
 * por estar en el bus, en una reunion, o donde no se puede mandar un audio.
 */
async function guardarTexto(quien: Remitente, texto: string): Promise<void> {
  const supabase = createSupabaseServiceRole();
  const resultado = await resumirTexto(texto);

  // Si la IA no contesta, la idea se guarda igual con lo que se puede sacar
  // sin ella. Perder la idea porque fallo un resumen seria lo peor posible.
  const primeraLinea = texto.split("\n")[0]!.trim();
  const idea = resultado.ok
    ? resultado.idea
    : {
        titulo:
          primeraLinea.length > 60 ? `${primeraLinea.slice(0, 57)}…` : primeraLinea,
        resumen: "",
        transcripcion: texto.slice(0, 50000),
        tags: [] as string[],
      };

  const { data, error } = await supabase
    .from("int_ideas")
    .insert({
      titulo: idea.titulo,
      resumen: idea.resumen,
      transcripcion: idea.transcripcion,
      tags: idea.tags,
      origen: "telegram",
      autor_id: quien.adminUserId,
      autor_nombre: quien.nombre,
      telegram_chat_id: quien.chatId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[telegram] insert texto:", error.message);
    await responder(quien.chatId, "No pude guardarla. Probá de nuevo.");
    return;
  }

  await supabase
    .from("int_telegram_usuarios")
    .update({ ultima_idea_at: new Date().toISOString() })
    .eq("chat_id", quien.chatId);

  const sitio = urlDelSitio();
  const link = sitio ? `\n\n${sitio}/admin/ideas/${data.id}` : "";
  const tags = idea.tags.length ? `\n🏷 ${escapar(idea.tags.join(", "))}` : "";
  const resumen = idea.resumen ? `\n\n${escapar(idea.resumen)}` : "";

  await responder(
    quien.chatId,
    `✅ <b>${escapar(idea.titulo)}</b>${resumen}${tags}${link}`,
  );
}

async function procesar(msg: MensajeTelegram): Promise<void> {
  const chatId = msg.chat.id;
  const texto = (msg.text ?? msg.caption ?? "").trim();

  // /start CODIGO es como Telegram pasa el codigo de un link de invitacion.
  if (texto.startsWith("/start") || texto.startsWith("/codigo")) {
    const arg = texto.split(/\s+/)[1];
    if (arg) {
      await canjear(msg, arg);
      return;
    }
    const ya = await remitenteAutorizado(chatId);
    await responder(
      chatId,
      ya
        ? AYUDA
        : "Para usar este bot necesitás un código de invitación.\nMandámelo así: <code>/codigo TUCODIGO</code>",
    );
    return;
  }

  const quien = await remitenteAutorizado(chatId);
  if (!quien) {
    await responder(
      chatId,
      "No estás autorizado todavía.\nSi tenés un código, mandámelo así: <code>/codigo TUCODIGO</code>",
    );
    return;
  }

  if (texto === "/ayuda" || texto === "/help") {
    await responder(chatId, AYUDA);
    return;
  }

  if (audioDe(msg)) {
    await guardarAudio(msg, quien);
    return;
  }

  if (texto && !texto.startsWith("/")) {
    await guardarTexto(quien, texto);
    return;
  }

  await responder(chatId, AYUDA);
}

/** Constant-time secret comparison; fails closed when anything is missing. */
function secretoValido(recibido: string | null): boolean {
  const secreto = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secreto || !recibido) return false;
  const a = Buffer.from(recibido, "utf8");
  const b = Buffer.from(secreto, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!secretoValido(req.headers.get("x-telegram-bot-api-secret-token"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: UpdateTelegram;
  try {
    update = (await req.json()) as UpdateTelegram;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const msg = update.message ?? update.edited_message;
  if (!msg?.chat?.id) return NextResponse.json({ ok: true });

  try {
    await procesar(msg);
  } catch (e) {
    // Siempre 200: un 500 hace que Telegram reintente el mismo update en
    // loop, y el que falla suele fallar igual la segunda vez.
    console.error("[telegram] webhook:", e);
  }

  return NextResponse.json({ ok: true });
}
