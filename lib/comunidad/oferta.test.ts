import { describe, expect, it } from "vitest";
import {
  esNivel,
  incluyeSesionArranque,
  montoCentavos,
  nivelesDisponibles,
  preventaVigente,
} from "./oferta";
import { formatoPesos } from "./precio";

const col = (iso: string) => new Date(`${iso}-05:00`);

describe("nivelesDisponibles", () => {
  it("hasta el 18 a medianoche: preventa y VIP", () => {
    expect(nivelesDisponibles(col("2026-10-15T10:00:00"))).toEqual(["preventa", "vip"]);
    expect(nivelesDisponibles(col("2026-10-18T23:59:00"))).toEqual(["preventa", "vip"]);
  });
  it("del 19 al 21 a las 8 p. m.: regular y VIP", () => {
    expect(nivelesDisponibles(col("2026-10-19T00:00:00"))).toEqual(["regular", "vip"]);
    expect(nivelesDisponibles(col("2026-10-21T19:59:00"))).toEqual(["regular", "vip"]);
  });
  it("después del cierre: nada", () => {
    expect(nivelesDisponibles(col("2026-10-21T20:01:00"))).toEqual([]);
  });
  it("preventaVigente respeta el límite del domingo 18", () => {
    expect(preventaVigente(col("2026-10-18T23:00:00"))).toBe(true);
    expect(preventaVigente(col("2026-10-19T00:01:00"))).toBe(false);
  });
});

describe("precios y bono", () => {
  it("montos en centavos de peso, fijos en el servidor", () => {
    expect(montoCentavos("preventa")).toBe(79_000_000);
    expect(montoCentavos("regular")).toBe(129_000_000);
    expect(montoCentavos("vip")).toBe(150_000_000);
  });
  it("la sesión de arranque es de preventa y VIP, no de regular", () => {
    expect(incluyeSesionArranque("preventa")).toBe(true);
    expect(incluyeSesionArranque("vip")).toBe(true);
    expect(incluyeSesionArranque("regular")).toBe(false);
  });
  it("esNivel solo acepta los tres niveles", () => {
    expect(esNivel("vip")).toBe(true);
    expect(esNivel("gratis")).toBe(false);
    expect(esNivel(undefined)).toBe(false);
  });
  it("formatea pesos con punto de miles", () => {
    expect(formatoPesos(79_000_000)).toBe("$790.000");
    expect(formatoPesos(150_000_000)).toBe("$1.500.000");
    expect(formatoPesos(129_000_000)).toBe("$1.290.000");
  });
});
