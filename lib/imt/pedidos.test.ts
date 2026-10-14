import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

/* ── Base en memoria con la parte del cliente de Supabase que usa pedidos.ts ── */

type Fila = Record<string, unknown>;
type Resultado = { data: unknown; error: { code?: string; message: string } | null };

const UNICOS: Record<string, string> = {
  imt_eventos_stripe: "stripe_event_id",
  imt_comisiones: "pedido_id",
  imt_cobros: "stripe_invoice_id",
};

class Consulta implements PromiseLike<Resultado> {
  private op: "select" | "insert" | "update" | "upsert" = "select";
  private payload: Fila = {};
  private opciones: { onConflict?: string; ignoreDuplicates?: boolean } = {};
  private filtros: ((f: Fila) => boolean)[] = [];
  private devolver = false;
  private tope: number | null = null;

  constructor(
    private tablas: Record<string, Fila[]>,
    private tabla: string,
  ) {}

  insert(p: Fila) {
    this.op = "insert";
    this.payload = p;
    return this;
  }
  update(p: Fila) {
    this.op = "update";
    this.payload = p;
    return this;
  }
  upsert(p: Fila, o: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.op = "upsert";
    this.payload = p;
    this.opciones = o;
    return this;
  }
  select() {
    this.devolver = true;
    return this;
  }
  eq(c: string, v: unknown) {
    this.filtros.push((f) => f[c] === v);
    return this;
  }
  in(c: string, vs: unknown[]) {
    this.filtros.push((f) => vs.includes(f[c]));
    return this;
  }
  ilike(c: string, v: string) {
    this.filtros.push((f) => String(f[c]).toLowerCase() === v.toLowerCase());
    return this;
  }
  order() {
    return this;
  }
  limit(n: number) {
    this.tope = n;
    return this;
  }
  maybeSingle() {
    return this.ejecutar(true);
  }
  single() {
    return this.ejecutar(true);
  }
  then<A, B>(ok?: (r: Resultado) => A | PromiseLike<A>, fail?: (e: unknown) => B | PromiseLike<B>) {
    return this.ejecutar(false).then(ok, fail);
  }

  private async ejecutar(uno: boolean): Promise<Resultado> {
    const filas = (this.tablas[this.tabla] ??= []);
    const coincide = (f: Fila) => this.filtros.every((fn) => fn(f));
    const unico = UNICOS[this.tabla];

    if (this.op === "insert" || this.op === "upsert") {
      const clave = this.op === "upsert" ? (this.opciones.onConflict ?? unico) : unico;
      const choque = clave && this.payload[clave] != null && filas.some((f) => f[clave] === this.payload[clave]);
      if (choque) {
        if (this.op === "upsert" && this.opciones.ignoreDuplicates) return { data: null, error: null };
        return { data: null, error: { code: "23505", message: "duplicate key" } };
      }
      // Los defaults de estado que pone la migración 0025.
      const porDefecto: Record<string, Fila> = {
        imt_eventos_stripe: { estado: "recibido" },
        imt_comisiones: { estado: "pendiente" },
      };
      const fila = { id: crypto.randomUUID(), ...porDefecto[this.tabla], ...this.payload };
      filas.push(fila);
      return { data: this.devolver ? (uno ? fila : [fila]) : null, error: null };
    }

    if (this.op === "update") {
      const tocadas = filas.filter(coincide);
      tocadas.forEach((f) => Object.assign(f, this.payload));
      return { data: this.devolver ? (uno ? (tocadas[0] ?? null) : tocadas) : null, error: null };
    }

    let sel = filas.filter(coincide);
    if (this.tope !== null) sel = sel.slice(0, this.tope);
    return { data: uno ? (sel[0] ?? null) : sel, error: null };
  }
}

function crearDb(tablas: Record<string, Fila[]>): SupabaseClient {
  return { from: (t: string) => new Consulta(tablas, t) } as unknown as SupabaseClient;
}

/* ── Mocks de Stripe y correo ── */

const sesionesStripe = new Map<string, Record<string, unknown>>();

vi.mock("./stripe", () => ({
  getImtStripe: () => ({
    checkout: { sessions: { retrieve: async (id: string) => sesionesStripe.get(id) } },
  }),
}));

const correos = vi.hoisted(() => ({
  pago: vi.fn(async () => ({ ok: true })),
  equipo: vi.fn(async () => ({ ok: true })),
  comision: vi.fn(async () => ({ ok: true })),
}));
vi.mock("./correo", () => ({
  correoPagoConfirmado: correos.pago,
  correoVentaEquipo: correos.equipo,
  correoComisionGenerada: correos.comision,
}));

import { procesarEventoImt } from "./pedidos";

/* ── Fixtures ── */

const PEDIDO_ID = "11111111-1111-4111-8111-111111111111";
const REFERIDOR_ID = "22222222-2222-4222-8222-222222222222";

function pedidoBase(extra: Fila = {}): Fila {
  return {
    id: PEDIDO_ID,
    plan: "acelera",
    periodo: "mensual",
    importe_cop: 6_900_000,
    estado: "pendiente",
    nombre: "Ana",
    empresa: "Tienda Demo",
    email: "ana@tienda.co",
    whatsapp: "3001234567",
    referidor_id: REFERIDOR_ID,
    pagado_at: null,
    stripe_customer_id: null,
    stripe_payment_intent_id: null,
    ...extra,
  };
}

function referidorBase(extra: Fila = {}): Fila {
  return { id: REFERIDOR_ID, estado: "activo", email: "ref@correo.com", nombre: "Ref", token_panel: "a".repeat(32), ...extra };
}

function sesion(extra: Record<string, unknown> = {}) {
  return {
    id: "cs_1",
    metadata: { imt_pedido_id: PEDIDO_ID },
    payment_status: "paid",
    currency: "cop",
    amount_total: 690_000_000,
    customer: "cus_1",
    subscription: "sub_1",
    payment_intent: null,
    invoice: "in_1",
    ...extra,
  };
}

function evento(id: string, type: string, object: Record<string, unknown>): Stripe.Event {
  return { id, type, livemode: false, created: 1, data: { object } } as unknown as Stripe.Event;
}

let tablas: Record<string, Fila[]>;

beforeEach(() => {
  tablas = {
    imt_pedidos: [pedidoBase()],
    imt_referidores: [referidorBase()],
  };
  sesionesStripe.clear();
  sesionesStripe.set("cs_1", sesion());
  vi.clearAllMocks();
});

const completado = (id = "evt_1") => evento(id, "checkout.session.completed", { id: "cs_1", metadata: { imt_pedido_id: PEDIDO_ID } });

describe("pago confirmado", () => {
  it("marca el pedido pagado, fija el mínimo de 3 meses y crea la comisión del 10%", async () => {
    const r = await procesarEventoImt(crearDb(tablas), completado());
    expect(r).toBe("pagado_con_comision");

    const pedido = tablas.imt_pedidos[0];
    expect(pedido.estado).toBe("pagado");
    expect(pedido.suscripcion_estado).toBe("activa");
    expect(pedido.stripe_subscription_id).toBe("sub_1");
    const pagado = new Date(pedido.pagado_at as string).getTime();
    const minimo = new Date(pedido.minimo_hasta as string).getTime();
    expect(minimo - pagado).toBeGreaterThan(88 * 24 * 3600 * 1000);

    expect(tablas.imt_comisiones).toHaveLength(1);
    expect(tablas.imt_comisiones[0]).toMatchObject({ pedido_id: PEDIDO_ID, base_cop: 6_900_000, monto_cop: 690_000, porcentaje: 10 });
    expect(tablas.imt_cobros).toHaveLength(1);
    expect(correos.pago).toHaveBeenCalledOnce();
    expect(correos.equipo).toHaveBeenCalledOnce();
  });

  it("un reintento del mismo evento no duplica nada", async () => {
    const db = crearDb(tablas);
    await procesarEventoImt(db, completado());
    const segundo = await procesarEventoImt(db, completado());
    expect(segundo).toBe("duplicado");
    expect(tablas.imt_comisiones).toHaveLength(1);
    expect(tablas.imt_cobros).toHaveLength(1);
    expect(correos.pago).toHaveBeenCalledOnce();
  });

  it("otro evento sobre un pedido ya pagado (async_payment_succeeded) no repite comisión ni correos", async () => {
    const db = crearDb(tablas);
    await procesarEventoImt(db, completado("evt_1"));
    const r = await procesarEventoImt(db, evento("evt_2", "checkout.session.async_payment_succeeded", { id: "cs_1" }));
    expect(r).toBe("ya_pagado");
    expect(tablas.imt_comisiones).toHaveLength(1);
    expect(correos.pago).toHaveBeenCalledOnce();
  });

  it("no marca pagado si Stripe dice que aún no se pagó", async () => {
    sesionesStripe.set("cs_1", sesion({ payment_status: "unpaid" }));
    const r = await procesarEventoImt(crearDb(tablas), completado());
    expect(r).toBe("pendiente_de_pago");
    expect(tablas.imt_pedidos[0].estado).toBe("pendiente");
    expect(tablas.imt_comisiones ?? []).toHaveLength(0);
  });

  it("rechaza un importe que no coincide con el pedido y deja el evento en error", async () => {
    sesionesStripe.set("cs_1", sesion({ amount_total: 100_000 }));
    await expect(procesarEventoImt(crearDb(tablas), completado())).rejects.toThrow(/Importe inesperado/);
    expect(tablas.imt_pedidos[0].estado).toBe("pendiente");
    expect(tablas.imt_eventos_stripe[0].estado).toBe("error");
  });

  it("un evento fallido se reprocesa cuando Stripe lo reintenta", async () => {
    const db = crearDb(tablas);
    sesionesStripe.set("cs_1", sesion({ amount_total: 1 }));
    await expect(procesarEventoImt(db, completado())).rejects.toThrow();
    sesionesStripe.set("cs_1", sesion());
    const r = await procesarEventoImt(db, completado());
    expect(r).toBe("pagado_con_comision");
    expect(tablas.imt_eventos_stripe[0].estado).toBe("procesado");
  });

  it("el plan anual cobra 10 meses y guarda el payment_intent", async () => {
    tablas.imt_pedidos = [pedidoBase({ periodo: "anual", importe_cop: 69_000_000 })];
    sesionesStripe.set("cs_1", sesion({ amount_total: 6_900_000_000, subscription: null, invoice: null, payment_intent: "pi_1" }));
    await procesarEventoImt(crearDb(tablas), completado());
    expect(tablas.imt_pedidos[0]).toMatchObject({ estado: "pagado", stripe_payment_intent_id: "pi_1", suscripcion_estado: null });
    expect(tablas.imt_comisiones[0].monto_cop).toBe(6_900_000);
  });
});

describe("comisiones", () => {
  it("no hay comisión sin referidor", async () => {
    tablas.imt_pedidos = [pedidoBase({ referidor_id: null })];
    const r = await procesarEventoImt(crearDb(tablas), completado());
    expect(r).toBe("pagado");
    expect(tablas.imt_comisiones ?? []).toHaveLength(0);
  });

  it("bloquea el auto-referido", async () => {
    tablas.imt_referidores = [referidorBase({ email: "ANA@tienda.co" })];
    const r = await procesarEventoImt(crearDb(tablas), completado());
    expect(r).toBe("pagado");
    expect(tablas.imt_comisiones ?? []).toHaveLength(0);
  });

  it("no comisiona si el referidor está pausado", async () => {
    tablas.imt_referidores = [referidorBase({ estado: "pausado" })];
    await procesarEventoImt(crearDb(tablas), completado());
    expect(tablas.imt_comisiones ?? []).toHaveLength(0);
  });
});

describe("renovaciones y reembolsos", () => {
  it("una renovación registra el cobro pero no genera otra comisión", async () => {
    const db = crearDb(tablas);
    await procesarEventoImt(db, completado());
    const r = await procesarEventoImt(
      db,
      evento("evt_2", "invoice.paid", { id: "in_2", amount_paid: 690_000_000, parent: { subscription_details: { metadata: { imt_pedido_id: PEDIDO_ID } } } }),
    );
    expect(r).toBe("cobro_registrado");
    expect(tablas.imt_cobros).toHaveLength(2);
    expect(tablas.imt_comisiones).toHaveLength(1);
  });

  it("la factura del primer cobro no se cuenta dos veces", async () => {
    const db = crearDb(tablas);
    await procesarEventoImt(
      db,
      evento("evt_0", "invoice.paid", { id: "in_1", amount_paid: 690_000_000, parent: { subscription_details: { metadata: { imt_pedido_id: PEDIDO_ID } } } }),
    );
    await procesarEventoImt(db, completado());
    expect(tablas.imt_cobros).toHaveLength(1);
  });

  it("el pago fallido pasa la suscripción a mora y un pago posterior la reactiva", async () => {
    const db = crearDb(tablas);
    await procesarEventoImt(db, completado());
    await procesarEventoImt(db, evento("evt_2", "invoice.payment_failed", { id: "in_2", metadata: {}, parent: { subscription_details: { metadata: { imt_pedido_id: PEDIDO_ID } } } }));
    expect(tablas.imt_pedidos[0].suscripcion_estado).toBe("en_mora");
    await procesarEventoImt(db, evento("evt_3", "invoice.paid", { id: "in_3", amount_paid: 690_000_000, parent: { subscription_details: { metadata: { imt_pedido_id: PEDIDO_ID } } } }));
    expect(tablas.imt_pedidos[0].suscripcion_estado).toBe("activa");
  });

  it("un reembolso total anula la comisión pendiente", async () => {
    const db = crearDb(tablas);
    sesionesStripe.set("cs_1", sesion({ subscription: null, invoice: null, payment_intent: "pi_1", amount_total: 690_000_000 }));
    await procesarEventoImt(db, completado());
    const r = await procesarEventoImt(db, evento("evt_2", "charge.refunded", { id: "ch_1", refunded: true, payment_intent: "pi_1", customer: "cus_1", amount: 690_000_000, created: 1 }));
    expect(r).toBe("reembolsado");
    expect(tablas.imt_pedidos[0].estado).toBe("reembolsado");
    expect(tablas.imt_comisiones[0].estado).toBe("anulada");
  });

  it("un reembolso con la comisión ya pagada la deja en revisión", async () => {
    const db = crearDb(tablas);
    sesionesStripe.set("cs_1", sesion({ subscription: null, invoice: null, payment_intent: "pi_1" }));
    await procesarEventoImt(db, completado());
    tablas.imt_comisiones[0].estado = "pagada";
    await procesarEventoImt(db, evento("evt_2", "charge.refunded", { id: "ch_1", refunded: true, payment_intent: "pi_1", customer: "cus_1", amount: 690_000_000, created: 1 }));
    expect(tablas.imt_comisiones[0].estado).toBe("en_revision");
  });

  it("un reembolso parcial no toca el pedido", async () => {
    const db = crearDb(tablas);
    await procesarEventoImt(db, completado());
    const r = await procesarEventoImt(db, evento("evt_2", "charge.refunded", { id: "ch_1", refunded: false, payment_intent: "pi_1", amount: 1, created: 1 }));
    expect(r).toBe("ignorado:reembolso_parcial");
    expect(tablas.imt_pedidos[0].estado).toBe("pagado");
  });
});

describe("eventos ajenos", () => {
  it("ignora sesiones sin metadata de IMT (otras apps de la misma cuenta de Stripe)", async () => {
    sesionesStripe.set("cs_x", sesion({ id: "cs_x", metadata: {} }));
    const r = await procesarEventoImt(crearDb(tablas), evento("evt_x", "checkout.session.completed", { id: "cs_x" }));
    expect(r).toBe("ignorado:sin_imt");
    expect(tablas.imt_pedidos[0].estado).toBe("pendiente");
  });

  it("ignora tipos que no maneja", async () => {
    const r = await procesarEventoImt(crearDb(tablas), evento("evt_y", "customer.created", { id: "cus_9" }));
    expect(r).toBe("ignorado:tipo");
  });

  it("marca expirado solo si seguía pendiente", async () => {
    const db = crearDb(tablas);
    await procesarEventoImt(db, evento("evt_e", "checkout.session.expired", { id: "cs_1", metadata: { imt_pedido_id: PEDIDO_ID } }));
    expect(tablas.imt_pedidos[0].estado).toBe("expirado");
  });
});
