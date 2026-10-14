import "server-only";
import { Resend } from "resend";
import { formatCop, planName, type PlanId } from "@/content/imt";
import type { Periodo } from "./pagos";
import { MESES_MINIMOS } from "./pagos";

type Resultado = { ok: true } | { ok: false; error: string };

function escapar(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function unaLinea(valor: string): string {
  return valor.replace(/[\r\n]+/g, " ").trim();
}

function cliente(): { resend: Resend; from: string } {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey) throw new Error("Falta RESEND_API_KEY en el entorno");
  if (!from) throw new Error("Falta RESEND_FROM en el entorno");
  return { resend: new Resend(apiKey), from };
}

function envoltorio(titulo: string, cuerpo: string): string {
  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#0A0A0A;max-width:560px;margin:0 auto;padding:24px;">
      <h1 style="font-size:22px;margin:0 0 16px;">${titulo}</h1>
      ${cuerpo}
      <p style="font-size:13px;color:#666;margin-top:28px;">IA Master Tech · Alexander Cast</p>
    </div>`;
}

async function enviar(params: { to: string; subject: string; html: string; replyTo?: string }): Promise<Resultado> {
  try {
    const { resend, from } = cliente();
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: unaLinea(params.subject),
      html: params.html,
      ...(params.replyTo ? { replyTo: params.replyTo } : {}),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

/** Confirmación de pago al cliente. */
export function correoPagoConfirmado(p: {
  to: string;
  nombre: string;
  plan: PlanId;
  periodo: Periodo;
  importeCop: number;
}): Promise<Resultado> {
  const cobro = p.periodo === "anual" ? "un pago anual" : "una suscripción mensual";
  return enviar({
    to: p.to,
    subject: `Recibimos tu pago — plan ${planName(p.plan)}`,
    html: envoltorio(
      `Gracias, ${escapar(p.nombre)}.`,
      `<p style="font-size:16px;line-height:1.6;">Recibimos tu pago de <strong>${formatCop(p.importeCop)} COP</strong> (${cobro}) del plan <strong>${escapar(planName(p.plan))}</strong>.</p>
       <p style="font-size:16px;line-height:1.6;">Te escribimos por WhatsApp en menos de 24 horas hábiles para agendar el diagnóstico y arrancar el primer sprint.</p>
       <p style="font-size:14px;line-height:1.6;color:#555;">Recuerda: el contrato tiene un mínimo de ${MESES_MINIMOS} meses.</p>`,
    ),
  });
}

/** Aviso interno de una venta nueva. */
export function correoVentaEquipo(p: {
  nombre: string;
  empresa: string;
  email: string;
  whatsapp: string;
  plan: PlanId;
  periodo: Periodo;
  importeCop: number;
  referido: string | null;
}): Promise<Resultado> {
  const to = process.env.DIAGNOSTICO_NOTIFY_TO;
  if (!to) return Promise.resolve({ ok: false, error: "Falta DIAGNOSTICO_NOTIFY_TO en el entorno" });
  const filas: [string, string][] = [
    ["Cliente", p.nombre],
    ["Empresa", p.empresa],
    ["Email", p.email],
    ["WhatsApp", p.whatsapp],
    ["Plan", `${planName(p.plan)} · ${p.periodo}`],
    ["Cobrado", `${formatCop(p.importeCop)} COP`],
    ["Referido por", p.referido ?? "—"],
  ];
  const tabla = filas
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#555;white-space:nowrap;">${escapar(k)}</td><td style="padding:6px 0;">${escapar(v)}</td></tr>`,
    )
    .join("");
  return enviar({
    to,
    replyTo: p.email,
    subject: `Venta IA Master Tech: ${p.empresa} (${planName(p.plan)} ${p.periodo})`,
    html: envoltorio(
      "Nueva venta pagada",
      `<table style="border-collapse:collapse;font-size:14px;line-height:1.5;">${tabla}</table>`,
    ),
  });
}

/** Enlace personal y panel del referidor. Solo se entrega por correo (verifica propiedad). */
export function correoReferidor(p: {
  to: string;
  nombre: string;
  enlace: string;
  panel: string;
  comisionPct: number;
}): Promise<Resultado> {
  return enviar({
    to: p.to,
    subject: "Tu enlace de referidos de IA Master Tech",
    html: envoltorio(
      `Hola, ${escapar(p.nombre)}.`,
      `<p style="font-size:16px;line-height:1.6;">Este es tu enlace personal. Cada empresa que contrate un plan desde él te genera el <strong>${p.comisionPct}%</strong> del primer pago.</p>
       <p style="font-size:15px;word-break:break-all;"><a href="${escapar(p.enlace)}">${escapar(p.enlace)}</a></p>
       <p style="font-size:16px;line-height:1.6;">Sigue tus referidos y comisiones en tu panel privado (no lo compartas, quien tenga el enlace lo ve):</p>
       <p style="font-size:15px;word-break:break-all;"><a href="${escapar(p.panel)}">${escapar(p.panel)}</a></p>`,
    ),
  });
}

/** Aviso al referidor: una venta suya se pagó. No incluye datos del cliente. */
export function correoComisionGenerada(p: {
  to: string;
  nombre: string;
  montoCop: number;
  panel: string;
}): Promise<Resultado> {
  return enviar({
    to: p.to,
    subject: "Tienes una comisión nueva en IA Master Tech",
    html: envoltorio(
      `Buenas noticias, ${escapar(p.nombre)}.`,
      `<p style="font-size:16px;line-height:1.6;">Una empresa que llegó por tu enlace pagó su plan. Generaste <strong>${formatCop(p.montoCop)} COP</strong> de comisión.</p>
       <p style="font-size:15px;"><a href="${escapar(p.panel)}">Ver mi panel</a></p>`,
    ),
  });
}

/** Aviso interno: alguien canceló la suscripción antes de cumplir el contrato mínimo. */
export function correoCancelacionAnticipada(p: {
  empresa: string;
  nombre: string;
  email: string;
  whatsapp: string;
  plan: PlanId;
  minimoHasta: Date;
}): Promise<Resultado> {
  const to = process.env.DIAGNOSTICO_NOTIFY_TO;
  if (!to) return Promise.resolve({ ok: false, error: "Falta DIAGNOSTICO_NOTIFY_TO en el entorno" });
  const hasta = p.minimoHasta.toLocaleDateString("es-CO", { dateStyle: "long", timeZone: "America/Bogota" });
  return enviar({
    to,
    replyTo: p.email,
    subject: `Cancelación antes del mínimo: ${p.empresa} (${planName(p.plan)})`,
    html: envoltorio(
      "Cancelación antes del contrato mínimo",
      `<p style="font-size:15px;line-height:1.6;"><strong>${escapar(p.empresa)}</strong> canceló su suscripción del plan <strong>${escapar(planName(p.plan))}</strong> antes de cumplir los ${MESES_MINIMOS} meses (el mínimo vencía el ${escapar(hasta)}).</p>
       <p style="font-size:14px;line-height:1.6;color:#555;">Contacto: ${escapar(p.nombre)} · ${escapar(p.email)} · ${escapar(p.whatsapp)}. Revisa si corresponde cobrar lo pendiente del mínimo.</p>`,
    ),
  });
}

/** Enlace mágico al portal de clientes. Mismo diseño de correo que el acceso de la comunidad. */
export function correoAccesoPortal(p: { to: string; nombre: string; enlace: string; bienvenida: boolean }): Promise<Resultado> {
  const saludo = p.nombre ? `Hola ${escapar(p.nombre)},` : "Hola,";
  const intro = p.bienvenida
    ? "Recibimos tu pago y ya creamos tu <strong>portal de cliente de IA Master Tech</strong>. Ahí ves tu plan, tus cobros y gestionas tu tarjeta. Sin contraseña: toca el botón y entras."
    : "Este es tu acceso al <strong>portal de cliente de IA Master Tech</strong>. Sin contraseña: toca el botón y entras.";
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0A0A0A;max-width:520px;margin:0 auto;padding:24px;">
      <h1 style="font-size:22px;margin:0 0 16px;">${saludo}</h1>
      <p style="font-size:16px;line-height:1.6;">${intro}</p>
      <p style="margin:28px 0;">
        <a href="${escapar(p.enlace)}" style="background:#A3E635;color:#050705;padding:14px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block;">Entrar a mi portal</a>
      </p>
      <p style="font-size:14px;line-height:1.6;color:#555;">El enlace funciona una sola vez y vence en 1 hora. Si caduca, entra a <a href="${escapar(new URL(p.enlace).origin)}/portal/login">${escapar(new URL(p.enlace).host)}/portal/login</a> y pide otro con tu correo.</p>
      <p style="font-size:14px;line-height:1.6;color:#555;">Si no esperabas este correo, ignóralo: no se crea ni se cambia nada.</p>
      <p style="font-size:16px;margin-top:24px;">Alexander Cast</p>
    </div>`;
  return enviar({
    to: p.to,
    subject: p.bienvenida ? "Tu portal de IA Master Tech está listo" : "Tu acceso al portal de IA Master Tech",
    html,
  });
}
