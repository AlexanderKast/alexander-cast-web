import { Resend } from "resend";
import { site } from "@/content/site";

type SendResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

let cached: Resend | null = null;

function getResend(): Resend {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Falta RESEND_API_KEY en el entorno");
  }
  cached = new Resend(apiKey);
  return cached;
}

function getFrom(): string {
  const from = process.env.RESEND_FROM;
  if (!from) {
    throw new Error("Falta RESEND_FROM en el entorno");
  }
  return from;
}

type WelcomeProps = {
  to: string;
  nombre?: string;
};

/**
 * Envia el correo de bienvenida tras suscripcion a la newsletter.
 */
export async function sendWelcomeEmail(
  props: WelcomeProps,
): Promise<SendResult> {
  try {
    const resend = getResend();
    const saludo = props.nombre ? `Hola ${props.nombre},` : "Hola,";
    const { data, error } = await resend.emails.send({
      from: getFrom(),
      to: props.to,
      subject: `Bienvenido al ecosistema de ${site.name}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;color:#0A0A0A;max-width:560px;margin:0 auto;padding:24px;">
          <h1 style="font-size:22px;margin:0 0 16px;">${saludo}</h1>
          <p style="font-size:16px;line-height:1.6;">
            Gracias por unirte. En este espacio comparto procesos reales sobre
            Dios, estrategia e IA al servicio de negocios con sentido.
          </p>
          <p style="font-size:16px;line-height:1.6;">
            Sin humo. Sin formulas magicas. Construyendo en publico.
          </p>
          <p style="font-size:16px;line-height:1.6;margin-top:24px;">
            Alexander Cast<br/>
            <a href="${site.url}" style="color:#E6B800;">${site.url.replace("https://", "")}</a>
          </p>
        </div>
      `,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id ?? "" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { ok: false, error: message };
  }
}

type LeadMagnetProps = {
  to: string;
  nombre?: string;
  leadMagnetTitulo: string;
  downloadUrl: string;
};

/**
 * Envia el lead magnet solicitado con link de descarga.
 */
export async function sendLeadMagnetEmail(
  props: LeadMagnetProps,
): Promise<SendResult> {
  try {
    const resend = getResend();
    const saludo = props.nombre ? `Hola ${props.nombre},` : "Hola,";
    const { data, error } = await resend.emails.send({
      from: getFrom(),
      to: props.to,
      subject: `Tu descarga: ${props.leadMagnetTitulo}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;color:#0A0A0A;max-width:560px;margin:0 auto;padding:24px;">
          <h1 style="font-size:22px;margin:0 0 16px;">${saludo}</h1>
          <p style="font-size:16px;line-height:1.6;">
            Aqui tienes tu copia de <strong>${props.leadMagnetTitulo}</strong>.
          </p>
          <p style="margin:24px 0;">
            <a href="${props.downloadUrl}" style="background:#E6B800;color:#0A0A0A;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
              Descargar ahora
            </a>
          </p>
          <p style="font-size:14px;line-height:1.6;color:#555;">
            Si el boton no funciona, copia este enlace en tu navegador:<br/>
            <span style="word-break:break-all;">${props.downloadUrl}</span>
          </p>
          <p style="font-size:16px;line-height:1.6;margin-top:24px;">
            Alexander Cast
          </p>
        </div>
      `,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id ?? "" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { ok: false, error: message };
  }
}

type ContactNotificationProps = {
  nombre: string;
  email: string;
  mensaje: string;
  asunto?: string;
};

/**
 * Envia notificacion interna al correo de contacto principal cuando alguien llena el form.
 */
export async function sendContactNotification(
  props: ContactNotificationProps,
): Promise<SendResult> {
  try {
    const resend = getResend();
    const asunto = props.asunto ?? `Nuevo contacto: ${props.nombre}`;
    const { data, error } = await resend.emails.send({
      from: getFrom(),
      to: site.contacto.principal,
      replyTo: props.email,
      subject: asunto,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;color:#0A0A0A;max-width:560px;margin:0 auto;padding:24px;">
          <h2 style="margin:0 0 12px;">Nuevo mensaje desde ${site.url.replace("https://", "")}</h2>
          <p><strong>Nombre:</strong> ${props.nombre}</p>
          <p><strong>Email:</strong> ${props.email}</p>
          <p><strong>Mensaje:</strong></p>
          <p style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:6px;">${props.mensaje}</p>
        </div>
      `,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id ?? "" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { ok: false, error: message };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type DiagnosticoNotificationProps = {
  empresa: string;
  email: string;
  /** Label/value rows, already human readable. Escaped here. */
  rows: { label: string; value: string }[];
};

/**
 * IA Master Tech: notifies a new /diagnostico lead to DIAGNOSTICO_NOTIFY_TO.
 * Every user-supplied value is HTML-escaped before it goes into the email.
 */
export async function sendDiagnosticoNotification(
  props: DiagnosticoNotificationProps,
): Promise<SendResult> {
  const to = process.env.DIAGNOSTICO_NOTIFY_TO;
  if (!to) return { ok: false, error: "Falta DIAGNOSTICO_NOTIFY_TO en el entorno" };

  try {
    const resend = getResend();
    const rows = props.rows
      .map(
        (row) =>
          `<tr><td style="padding:6px 12px 6px 0;color:#555;vertical-align:top;white-space:nowrap;">${escapeHtml(row.label)}</td><td style="padding:6px 0;white-space:pre-wrap;">${escapeHtml(row.value)}</td></tr>`,
      )
      .join("");
    const { data, error } = await resend.emails.send({
      from: getFrom(),
      to,
      replyTo: props.email,
      subject: `Nuevo diagnóstico IA Master Tech: ${props.empresa}`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#0A0A0A;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="margin:0 0 16px;">Nuevo diagnóstico — ${escapeHtml(props.empresa)}</h2>
          <table style="border-collapse:collapse;font-size:14px;line-height:1.5;">${rows}</table>
        </div>
      `,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id ?? "" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { ok: false, error: message };
  }
}
