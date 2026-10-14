import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { baseUrl } from "@/lib/comunidad/url";
import { correoReferidor } from "./correo";
import { COMISION_PCT, generarCodigo, type ReferidorInput } from "./pagos";

export function enlaceReferido(codigo: string, base: string = baseUrl()): string {
  return `${base}/r/${codigo}`;
}

export function enlacePanel(token: string, base: string = baseUrl()): string {
  return `${base}/referidos/panel/${token}`;
}

type Fila = { id: string; codigo: string; token_panel: string; nombre: string; email: string };

/**
 * Registra un referidor. El enlace y el panel SOLO se entregan por correo:
 * así quien escribe un correo ajeno no obtiene el panel de otra persona.
 * Si el correo ya existe se reenvía lo mismo, y la respuesta es idéntica
 * para no revelar quién está registrado.
 */
export async function registrarReferidor(
  db: SupabaseClient,
  input: ReferidorInput,
  base: string = baseUrl(),
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existente } = await db
    .from("imt_referidores")
    .select("id, codigo, token_panel, nombre, email")
    .ilike("email", input.email)
    .maybeSingle<Fila>();

  let fila: Fila | null = existente ?? null;

  if (!fila) {
    for (let intento = 0; intento < 5 && !fila; intento++) {
      const { data, error } = await db
        .from("imt_referidores")
        .insert({
          codigo: generarCodigo(input.nombre),
          nombre: input.nombre,
          email: input.email,
          whatsapp: input.whatsapp,
          consentimiento: true,
        })
        .select("id, codigo, token_panel, nombre, email")
        .maybeSingle<Fila>();
      if (data) {
        fila = data;
      } else if (error?.code !== "23505") {
        console.error("[imt-referidos] no se pudo registrar:", error?.message);
        return { ok: false, error: "No pudimos completar tu registro. Intenta de nuevo." };
      } else {
        // Choque de código o de correo (carrera): si ya existe el correo, se reutiliza.
        const { data: otro } = await db
          .from("imt_referidores")
          .select("id, codigo, token_panel, nombre, email")
          .ilike("email", input.email)
          .maybeSingle<Fila>();
        if (otro) fila = otro;
      }
    }
  }
  if (!fila) return { ok: false, error: "No pudimos completar tu registro. Intenta de nuevo." };

  const envio = await correoReferidor({
    to: fila.email,
    nombre: fila.nombre,
    enlace: enlaceReferido(fila.codigo, base),
    panel: enlacePanel(fila.token_panel, base),
    comisionPct: COMISION_PCT,
  });
  if (!envio.ok) {
    console.error("[imt-referidos] correo no enviado:", envio.error);
    return { ok: false, error: "Te registramos, pero no pudimos enviarte el correo. Escríbenos por WhatsApp." };
  }
  return { ok: true };
}

export type PanelReferidor = {
  referidor: { codigo: string; nombre: string; estado: string };
  enlace: string;
  totales: { pendienteCop: number; pagadoCop: number; ventas: number };
  filas: { fecha: string; plan: string; periodo: string; estadoPedido: string; comisionCop: number | null; comisionEstado: string | null }[];
};

/** Datos del panel privado. El token es el único acceso: forma validada antes de llamar. */
export async function cargarPanel(
  db: SupabaseClient,
  token: string,
  base: string = baseUrl(),
): Promise<PanelReferidor | null> {
  const { data: r } = await db
    .from("imt_referidores")
    .select("id, codigo, nombre, estado")
    .eq("token_panel", token)
    .maybeSingle<{ id: string; codigo: string; nombre: string; estado: string }>();
  if (!r) return null;

  const { data: pedidos } = await db
    .from("imt_pedidos")
    .select("id, created_at, plan, periodo, estado, imt_comisiones(monto_cop, estado)")
    .eq("referidor_id", r.id)
    .in("estado", ["pagado", "reembolsado"])
    .order("created_at", { ascending: false })
    .limit(100);

  type PedidoRef = {
    created_at: string;
    plan: string;
    periodo: string;
    estado: string;
    imt_comisiones: { monto_cop: number; estado: string }[] | { monto_cop: number; estado: string } | null;
  };

  const filas = ((pedidos ?? []) as unknown as PedidoRef[]).map((p) => {
    const c = Array.isArray(p.imt_comisiones) ? p.imt_comisiones[0] : p.imt_comisiones;
    return {
      fecha: p.created_at,
      plan: p.plan,
      periodo: p.periodo,
      estadoPedido: p.estado,
      comisionCop: c?.monto_cop ?? null,
      comisionEstado: c?.estado ?? null,
    };
  });

  const totales = {
    pendienteCop: filas.filter((f) => f.comisionEstado === "pendiente").reduce((s, f) => s + (f.comisionCop ?? 0), 0),
    pagadoCop: filas.filter((f) => f.comisionEstado === "pagada").reduce((s, f) => s + (f.comisionCop ?? 0), 0),
    ventas: filas.filter((f) => f.estadoPedido === "pagado").length,
  };

  return { referidor: { codigo: r.codigo, nombre: r.nombre, estado: r.estado }, enlace: enlaceReferido(r.codigo, base), totales, filas };
}
