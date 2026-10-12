import { describe, expect, it } from "vitest";
import { decidirPago, pedidoIdValido, type PagoNormalizado, type PedidoEsperado } from "./pagos";

const ID = "3f2b8c1e-5a4d-4e7b-9c10-1a2b3c4d5e6f";
const pedido = (o: Partial<PedidoEsperado> = {}): PedidoEsperado => ({
  id: ID,
  estado: "pendiente",
  montoCentavos: 29700,
  moneda: "usd",
  paymentIntent: null,
  ...o,
});
const pago = (o: Partial<PagoNormalizado> = {}): PagoNormalizado => ({
  sessionId: "cs_1",
  paymentIntent: "pi_1",
  estado: "paid",
  montoCentavos: 29700,
  moneda: "usd",
  pedidoId: ID,
  ...o,
});

describe("decidirPago", () => {
  it("aplica un pago correcto", () => {
    expect(decidirPago(pago(), pedido())).toEqual({ accion: "aplicar", pedidoId: ID });
  });
  it("es idempotente con el mismo payment intent", () => {
    expect(decidirPago(pago(), pedido({ estado: "pagado", paymentIntent: "pi_1" })).accion).toBe("duplicado");
  });
  it("marca pago extra si ya estaba pagado con otro intent", () => {
    expect(decidirPago(pago({ paymentIntent: "pi_2" }), pedido({ estado: "pagado", paymentIntent: "pi_1" })).accion).toBe("pago_extra");
  });
  it("manda a revisión monto y moneda distintos", () => {
    expect(decidirPago(pago({ montoCentavos: 100 }), pedido())).toMatchObject({ accion: "revision", motivo: "monto_distinto" });
    expect(decidirPago(pago({ moneda: "cop" }), pedido())).toMatchObject({ accion: "revision", motivo: "moneda_distinta" });
    expect(decidirPago(pago({ montoCentavos: null }), pedido())).toMatchObject({ accion: "revision", motivo: "monto_ausente" });
  });
  it("espera pagos no confirmados y no aplica nada", () => {
    expect(decidirPago(pago({ estado: "unpaid" }), pedido()).accion).toBe("esperar");
  });
  it("sin pedido o metadata no concilia", () => {
    expect(decidirPago(pago({ pedidoId: null }), null).accion).toBe("sin_pedido");
    expect(decidirPago(pago(), null).accion).toBe("sin_pedido");
  });
});

describe("pedidoIdValido", () => {
  it("solo acepta UUID", () => {
    expect(pedidoIdValido(ID.toUpperCase())).toBe(ID);
    expect(pedidoIdValido("no-es-uuid")).toBeNull();
    expect(pedidoIdValido(null)).toBeNull();
  });
});
