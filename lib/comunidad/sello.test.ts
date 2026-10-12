import { describe, expect, it } from "vitest";
import { firmarPedido, leerPedidoFirmado, TTL_PEDIDO_MS } from "./sello";
import { sanearUtm } from "./consentimiento";

const ID = "3f2b8c1e-5a4d-4e7b-9c10-1a2b3c4d5e6f";
const SECRETO = "secreto-de-prueba";
const T0 = Date.UTC(2026, 9, 12, 12);

describe("sello del pedido", () => {
  it("un sello válido devuelve el id", () => {
    expect(leerPedidoFirmado(firmarPedido(ID, T0, SECRETO), SECRETO, T0 + 1000)).toBe(ID);
  });
  it("un UUID suelto NO prueba propiedad", () => {
    expect(leerPedidoFirmado(ID, SECRETO, T0)).toBeNull();
  });
  it("detecta manipulación del id o de la firma", () => {
    const sello = firmarPedido(ID, T0, SECRETO);
    const otroId = "aaaaaaaa-5a4d-4e7b-9c10-1a2b3c4d5e6f";
    expect(leerPedidoFirmado(sello.replace(ID, otroId), SECRETO, T0)).toBeNull();
    expect(leerPedidoFirmado(sello.slice(0, -2) + "xx", SECRETO, T0)).toBeNull();
  });
  it("no vale con otro secreto", () => {
    expect(leerPedidoFirmado(firmarPedido(ID, T0, SECRETO), "otro", T0)).toBeNull();
  });
  it("caduca", () => {
    const sello = firmarPedido(ID, T0, SECRETO);
    expect(leerPedidoFirmado(sello, SECRETO, T0 + TTL_PEDIDO_MS - 5000)).toBe(ID);
    expect(leerPedidoFirmado(sello, SECRETO, T0 + TTL_PEDIDO_MS + 5000)).toBeNull();
  });
  it("rechaza basura", () => {
    for (const x of ["", "a.b", "a.b.c.d", null, undefined, "x".repeat(300)]) {
      expect(leerPedidoFirmado(x as string, SECRETO, T0)).toBeNull();
    }
  });
});

describe("sanearUtm", () => {
  it("deja campañas normales y recorta", () => {
    expect(sanearUtm("feria_effix-2026")).toBe("feria_effix-2026");
    expect(sanearUtm("a".repeat(500))).toHaveLength(100);
  });
  it("quita caracteres de marcado y descarta correos o teléfonos", () => {
    expect(sanearUtm("<script>x</script>")).not.toMatch(/[<>]/);
    expect(sanearUtm("juan@correo.com")).toBeNull();
    expect(sanearUtm("3001234567")).toBeNull();
    expect(sanearUtm("   ")).toBeNull();
    expect(sanearUtm(undefined)).toBeNull();
  });
});
