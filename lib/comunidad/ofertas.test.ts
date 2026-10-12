import { describe, expect, it } from "vitest";
import { accionParaOferta, ventanaDeOferta, type ContextoCompra, type OfertaVista } from "./ofertas";

const AHORA = new Date("2026-10-15T12:00:00-05:00");
const oferta = (o: Partial<OfertaVista> = {}): OfertaVista => ({
  id: "of-1",
  productoId: "prod-a",
  cohorteId: "coh-1",
  slug: "regular",
  nombre: "Regular",
  nota: null,
  precioCentavos: 100,
  moneda: "cop",
  disponibleDesde: null,
  disponibleHasta: null,
  cupos: null,
  derechos: [],
  extras: [],
  requiereProductoId: null,
  orden: 1,
  ...o,
});
const ctx = (c: Partial<ContextoCompra> = {}): ContextoCompra => ({
  ahora: AHORA,
  derechos: [],
  pedidosAbiertos: {},
  cuposLibres: 10,
  ...c,
});

describe("ventanaDeOferta", () => {
  it("abierta, próxima y cerrada según las fechas", () => {
    expect(ventanaDeOferta(oferta(), AHORA)).toBe("abierta");
    expect(ventanaDeOferta(oferta({ disponibleDesde: "2026-10-19T00:00:00-05:00" }), AHORA)).toBe("proxima");
    expect(ventanaDeOferta(oferta({ disponibleHasta: "2026-10-14T23:59:59-05:00" }), AHORA)).toBe("cerrada");
    expect(ventanaDeOferta(oferta({ disponibleHasta: "2026-10-18T23:59:59-05:00" }), AHORA)).toBe("abierta");
  });
});

describe("accionParaOferta", () => {
  it("una cuenta sin compras puede comprar (y ve el catálogo sin pagar nada)", () => {
    expect(accionParaOferta(oferta(), null, ctx())).toEqual({ tipo: "comprar", cuposSinVerificar: false });
  });

  it("comprar el programa A no impide comprar el programa B ni lo habilita", () => {
    const tieneA = ctx({ derechos: [{ productoId: "prod-a", cohorteId: "coh-1" }] });
    expect(accionParaOferta(oferta(), null, tieneA).tipo).toBe("adquirido");
    const ofertaB = oferta({ id: "of-b", productoId: "prod-b", cohorteId: "coh-b" });
    expect(accionParaOferta(ofertaB, null, tieneA)).toEqual({ tipo: "comprar", cuposSinVerificar: false });
  });

  it("otra oferta del mismo programa y cohorte cuenta como ya adquirido (solape)", () => {
    const tieneRegular = ctx({ derechos: [{ productoId: "prod-a", cohorteId: "coh-1" }] });
    expect(accionParaOferta(oferta({ id: "of-vip", slug: "vip" }), null, tieneRegular).tipo).toBe("adquirido");
  });

  it("fuera de ventana no se ofrece comprar", () => {
    expect(accionParaOferta(oferta({ disponibleHasta: "2026-10-01T00:00:00-05:00" }), null, ctx())).toEqual({
      tipo: "no_disponible",
      motivo: "cerrada",
    });
    expect(accionParaOferta(oferta({ disponibleDesde: "2026-12-01T00:00:00-05:00" }), null, ctx())).toEqual({
      tipo: "no_disponible",
      motivo: "proxima",
    });
  });

  it("un upsell exige el programa base (de la oferta o del producto)", () => {
    const up = oferta({ id: "of-up", productoId: "prod-up", cohorteId: null, requiereProductoId: "prod-a" });
    expect(accionParaOferta(up, null, ctx())).toEqual({ tipo: "no_disponible", motivo: "requisito" });
    expect(accionParaOferta(up, null, ctx({ derechos: [{ productoId: "prod-a", cohorteId: "coh-1" }] })).tipo).toBe("comprar");
    // requisito declarado en el producto
    const upProd = oferta({ id: "of-up2", productoId: "prod-up", cohorteId: null });
    expect(accionParaOferta(upProd, "prod-a", ctx())).toEqual({ tipo: "no_disponible", motivo: "requisito" });
  });

  it("sin cupos no se vende, salvo a quien ya tiene su pedido abierto (su reserva)", () => {
    expect(accionParaOferta(oferta(), null, ctx({ cuposLibres: 0 }))).toEqual({ tipo: "no_disponible", motivo: "agotada" });
    expect(accionParaOferta(oferta(), null, ctx({ cuposLibres: 0, pedidosAbiertos: { "of-1": "ped-1" } }))).toEqual({
      tipo: "continuar",
      pedidoId: "ped-1",
    });
  });

  it("si el servicio de cupos falla se avisa en vez de aparentar éxito", () => {
    expect(accionParaOferta(oferta(), null, ctx({ cuposLibres: null }))).toEqual({ tipo: "comprar", cuposSinVerificar: true });
  });

  it("con un pedido propio abierto se ofrece continuar la compra", () => {
    expect(accionParaOferta(oferta(), null, ctx({ pedidosAbiertos: { "of-1": "ped-9" } }))).toEqual({
      tipo: "continuar",
      pedidoId: "ped-9",
    });
  });
});
