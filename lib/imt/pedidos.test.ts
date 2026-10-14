import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { crearDb, type Fila } from "../../tests/helpers/fake-supabase";

/* ── Mocks de Stripe y correo ── */

const sesionesStripe = new Map<string, Record<string, unknown>>();

const stripeMock = vi.hoisted(() => ({
  programadas: new Set<string>(),
  crear: vi.fn(),
  actualizar: vi.fn(),
}));

vi.mock("./stripe", () => ({
  getImtStripe: () => ({
    checkout: { sessions: { retrieve: async (id: string) => sesionesStripe.get(id) } },
    subscriptions: {
      retrieve: async (id: string) => ({
        id,
        schedule: stripeMock.programadas.has(id) ? "sub_sched_1" : null,
        items: { data: [{ price: { id: "price_1" }, quantity: 1 }] },
        metadata: { imt_pedido_id: "11111111-1111-4111-8111-111111111111" },
      }),
    },
    subscriptionSchedules: {
      create: async (params: { from_subscription: string }) => {
        await stripeMock.crear(params);
        stripeMock.programadas.add(params.from_subscription);
        return { id: "sub_sched_1", phases: [{ start_date: 1_000 }] };
      },
      update: stripeMock.actualizar,
    },
  }),
}));

const correos = vi.hoisted(() => ({
  pago: vi.fn(async () => ({ ok: true })),
  equipo: vi.fn(async () => ({ ok: true })),
  comision: vi.fn(async () => ({ ok: true })),
  cancelacion: vi.fn(async () => ({ ok: true })),
}));
vi.mock("./correo", () => ({
  correoPagoConfirmado: correos.pago,
  correoVentaEquipo: correos.equipo,
  correoComisionGenerada: correos.comision,
  correoCancelacionAnticipada: correos.cancelacion,
}));

const portalMock = vi.hoisted(() => ({
  aprovisionar: vi.fn(),
  enviarAcceso: vi.fn(async () => true),
}));
vi.mock("./portal", () => ({
  aprovisionarPortal: portalMock.aprovisionar,
  enviarAccesoPortal: portalMock.enviarAcceso,
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
  portalMock.aprovisionar.mockReset();
  portalMock.aprovisionar.mockResolvedValue({
    clientId: "cli_1",
    slug: "tienda-demo",
    acceso: { tokenHash: "h".repeat(40), tipo: "magiclink" },
  });
  portalMock.enviarAcceso.mockClear();
  stripeMock.programadas.clear();
  stripeMock.crear.mockReset();
  stripeMock.actualizar.mockReset();
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
    const r = await procesarEventoImt(db, evento("evt_2", "checkout.session.async_payment_succeeded", { id: "cs_1", metadata: { imt_pedido_id: PEDIDO_ID } }));
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
    const r = await procesarEventoImt(db, evento("evt_2", "charge.refunded", { id: "ch_1", refunded: false, payment_intent: "pi_1", customer: "cus_1", amount: 1, created: 1 }));
    expect(r).toBe("ignorado:reembolso_parcial");
    expect(tablas.imt_pedidos[0].estado).toBe("pagado");
  });
});

describe("eventos ajenos", () => {
  it("ignora sesiones sin metadata de IMT (otras apps de la misma cuenta de Stripe)", async () => {
    sesionesStripe.set("cs_x", sesion({ id: "cs_x", metadata: {} }));
    const r = await procesarEventoImt(crearDb(tablas), evento("evt_x", "checkout.session.completed", { id: "cs_x" }));
    expect(r).toBe("ignorado:ajeno");
    expect(tablas.imt_pedidos[0].estado).toBe("pendiente");
    // Un evento de otra app no se copia a la base de IMT.
    expect(tablas.imt_eventos_stripe ?? []).toHaveLength(0);
  });

  it("ignora metadata que no apunta a un pedido real", async () => {
    const r = await procesarEventoImt(
      crearDb(tablas),
      evento("evt_f", "checkout.session.completed", { id: "cs_f", metadata: { imt_pedido_id: "99999999-9999-4999-8999-999999999999" } }),
    );
    expect(r).toBe("ignorado:ajeno");
    expect(tablas.imt_eventos_stripe ?? []).toHaveLength(0);
    const r2 = await procesarEventoImt(
      crearDb(tablas),
      evento("evt_g", "checkout.session.completed", { id: "cs_g", metadata: { imt_pedido_id: "no-es-uuid" } }),
    );
    expect(r2).toBe("ignorado:ajeno");
  });

  it("si la base falla al clasificar, lanza para que Stripe reintente en vez de descartar el evento", async () => {
    const falla = { message: "db caída" };
    const cadena = { eq: () => cadena, limit: async () => ({ data: null, error: falla }), maybeSingle: async () => ({ data: null, error: falla }) };
    const dbRota = { from: () => ({ select: () => cadena }) } as unknown as SupabaseClient;
    await expect(procesarEventoImt(dbRota, completado())).rejects.toThrow(/No se pudo comprobar/);
    await expect(
      procesarEventoImt(dbRota, evento("evt_r", "charge.refunded", { id: "ch_1", refunded: true, payment_intent: "pi_1", amount: 1, created: 1 })),
    ).rejects.toThrow(/No se pudo comprobar/);
  });

  it("reconoce un reembolso del plan anual por la metadata del cargo", async () => {
    const db = crearDb(tablas);
    sesionesStripe.set("cs_1", sesion({ subscription: null, invoice: null, payment_intent: "pi_1" }));
    await procesarEventoImt(db, completado());
    tablas.imt_pedidos[0].stripe_payment_intent_id = null;
    const r = await procesarEventoImt(
      db,
      evento("evt_m", "charge.refunded", { id: "ch_1", refunded: true, payment_intent: "pi_1", metadata: { imt_pedido_id: PEDIDO_ID }, amount: 690_000_000, created: 1 }),
    );
    expect(r).toBe("reembolsado");
    expect(tablas.imt_pedidos[0].estado).toBe("reembolsado");
  });

  it("ignora un reembolso de un cliente que no es de IMT y no lo guarda", async () => {
    const r = await procesarEventoImt(
      crearDb(tablas),
      evento("evt_z", "charge.refunded", { id: "ch_9", refunded: true, payment_intent: "pi_otro", customer: "cus_otro", amount: 1, created: 1 }),
    );
    expect(r).toBe("ignorado:ajeno");
    expect(tablas.imt_eventos_stripe ?? []).toHaveLength(0);
  });

  it("ignora tipos que no maneja", async () => {
    const r = await procesarEventoImt(crearDb(tablas), evento("evt_y", "customer.created", { id: "cus_9" }));
    expect(r).toBe("ignorado:ajeno");
    expect(tablas.imt_eventos_stripe ?? []).toHaveLength(0);
  });

  it("marca expirado solo si seguía pendiente", async () => {
    const db = crearDb(tablas);
    await procesarEventoImt(db, evento("evt_e", "checkout.session.expired", { id: "cs_1", metadata: { imt_pedido_id: PEDIDO_ID } }));
    expect(tablas.imt_pedidos[0].estado).toBe("expirado");
  });
});

describe("compromiso del contrato mínimo", () => {
  it("la suscripción mensual queda programada con 3 cobros y se libera después", async () => {
    await procesarEventoImt(crearDb(tablas), completado());
    expect(stripeMock.crear).toHaveBeenCalledOnce();
    expect(stripeMock.crear).toHaveBeenCalledWith({ from_subscription: "sub_1" });
    expect(stripeMock.actualizar).toHaveBeenCalledOnce();
    const [id, params] = stripeMock.actualizar.mock.calls[0];
    expect(id).toBe("sub_sched_1");
    expect(params).toMatchObject({
      end_behavior: "release",
      proration_behavior: "none",
      phases: [{ start_date: 1_000, items: [{ price: "price_1", quantity: 1 }], duration: { interval: "month", interval_count: 3 } }],
    });
  });

  it("un evento repetido no crea otro calendario", async () => {
    const db = crearDb(tablas);
    await procesarEventoImt(db, completado("evt_1"));
    await procesarEventoImt(db, evento("evt_2", "checkout.session.async_payment_succeeded", { id: "cs_1", metadata: { imt_pedido_id: PEDIDO_ID } }));
    expect(stripeMock.crear).toHaveBeenCalledOnce();
  });

  it("el plan anual no programa nada", async () => {
    tablas.imt_pedidos = [pedidoBase({ periodo: "anual", importe_cop: 39_000_000 })];
    sesionesStripe.set("cs_1", sesion({ amount_total: 3_900_000_000, subscription: null, invoice: null, payment_intent: "pi_1" }));
    await procesarEventoImt(crearDb(tablas), completado());
    expect(stripeMock.crear).not.toHaveBeenCalled();
    expect(stripeMock.actualizar).not.toHaveBeenCalled();
  });

  it("si Stripe falla al programar, el pago queda guardado y el reintento termina el trabajo", async () => {
    const db = crearDb(tablas);
    stripeMock.crear.mockRejectedValueOnce(new Error("stripe caído"));
    await expect(procesarEventoImt(db, completado())).rejects.toThrow(/stripe caído/);
    expect(tablas.imt_pedidos[0].estado).toBe("pagado");
    expect(stripeMock.actualizar).not.toHaveBeenCalled();

    const r = await procesarEventoImt(db, completado());
    expect(r).toBe("ya_pagado");
    expect(stripeMock.actualizar).toHaveBeenCalledOnce();
    expect(tablas.imt_comisiones).toHaveLength(1);
    expect(correos.pago).toHaveBeenCalledOnce();
  });
});

describe("reintentos del plan anual", () => {
  it("un segundo evento del mismo pago anual no duplica el cobro ni la comisión", async () => {
    tablas.imt_pedidos = [pedidoBase({ periodo: "anual", importe_cop: 39_000_000 })];
    sesionesStripe.set("cs_1", sesion({ amount_total: 3_900_000_000, subscription: null, invoice: null, payment_intent: "pi_1" }));
    const db = crearDb(tablas);
    await procesarEventoImt(db, completado("evt_1"));
    await procesarEventoImt(db, evento("evt_2", "checkout.session.async_payment_succeeded", { id: "cs_1", metadata: { imt_pedido_id: PEDIDO_ID } }));
    expect(tablas.imt_cobros).toHaveLength(1);
    expect(tablas.imt_comisiones).toHaveLength(1);
    expect(correos.pago).toHaveBeenCalledOnce();
  });
});

describe("cancelación de la suscripción", () => {
  const cancelacion = (id = "evt_c") =>
    evento(id, "customer.subscription.deleted", { id: "sub_1", metadata: { imt_pedido_id: PEDIDO_ID } });

  it("avisa al equipo si cancelan antes de cumplir el mínimo", async () => {
    const db = crearDb(tablas);
    await procesarEventoImt(db, completado());
    const r = await procesarEventoImt(db, cancelacion());
    expect(r).toBe("cancelada_antes_del_minimo");
    expect(tablas.imt_pedidos[0].suscripcion_estado).toBe("cancelada");
    expect(correos.cancelacion).toHaveBeenCalledOnce();
  });

  it("no avisa si el mínimo ya se cumplió", async () => {
    const db = crearDb(tablas);
    await procesarEventoImt(db, completado());
    tablas.imt_pedidos[0].minimo_hasta = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const r = await procesarEventoImt(db, cancelacion());
    expect(r).toBe("suscripcion_cancelada");
    expect(correos.cancelacion).not.toHaveBeenCalled();
  });
});

describe("portal del cliente al pagar", () => {
  it("crea el portal con los datos del pedido y envía el enlace de bienvenida", async () => {
    await procesarEventoImt(crearDb(tablas), completado(), "https://www.masteria.cloud");
    expect(portalMock.aprovisionar).toHaveBeenCalledOnce();
    expect(portalMock.aprovisionar.mock.calls[0][1]).toEqual({
      id: PEDIDO_ID,
      email: "ana@tienda.co",
      nombre: "Ana",
      empresa: "Tienda Demo",
    });
    expect(portalMock.enviarAcceso).toHaveBeenCalledOnce();
    expect(portalMock.enviarAcceso).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ana@tienda.co", bienvenida: true, base: "https://www.masteria.cloud" }),
    );
  });

  it("si la persona ya tenía portal (sin enlace nuevo) no se envía otro correo de acceso", async () => {
    portalMock.aprovisionar.mockResolvedValue({ clientId: "cli_1", slug: "tienda-demo", acceso: null });
    await procesarEventoImt(crearDb(tablas), completado());
    expect(portalMock.aprovisionar).toHaveBeenCalledOnce();
    expect(portalMock.enviarAcceso).not.toHaveBeenCalled();
  });

  it("un fallo al crear el portal lanza para que Stripe reintente, y el reintento lo completa", async () => {
    const db = crearDb(tablas);
    portalMock.aprovisionar.mockRejectedValueOnce(new Error("supabase auth caído"));
    await expect(procesarEventoImt(db, completado())).rejects.toThrow(/supabase auth caído/);
    expect(tablas.imt_pedidos[0].estado).toBe("pagado");
    expect(portalMock.enviarAcceso).not.toHaveBeenCalled();

    const r = await procesarEventoImt(db, completado());
    expect(r).toBe("ya_pagado");
    expect(portalMock.enviarAcceso).toHaveBeenCalledOnce();
    expect(tablas.imt_comisiones).toHaveLength(1);
  });

  it("un evento repetido vuelve a llamar al aprovisionamiento (idempotente) pero no a enviar correos de nuevo", async () => {
    const db = crearDb(tablas);
    await procesarEventoImt(db, completado("evt_1"));
    portalMock.aprovisionar.mockResolvedValue({ clientId: "cli_1", slug: "tienda-demo", acceso: null });
    await procesarEventoImt(db, evento("evt_2", "checkout.session.async_payment_succeeded", { id: "cs_1", metadata: { imt_pedido_id: PEDIDO_ID } }));
    expect(portalMock.enviarAcceso).toHaveBeenCalledOnce();
    expect(correos.pago).toHaveBeenCalledOnce();
  });
});
