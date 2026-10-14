import { describe, expect, it } from "vitest";
import {
  aMenorUnidad,
  calcularComision,
  checkoutSchema,
  decidirComision,
  deMenorUnidad,
  generarCodigo,
  importeCop,
  minimoHasta,
  normalizarCodigo,
  esTokenPanel,
} from "./pagos";

describe("importeCop", () => {
  it("mensual es el fee del plan", () => {
    expect(importeCop("automatiza", "mensual")).toBe(3_900_000);
    expect(importeCop("acelera", "mensual")).toBe(6_900_000);
    expect(importeCop("escala", "mensual")).toBe(9_600_000);
  });

  it("anual son exactamente 10 meses, sin el redondeo del precio equivalente", () => {
    expect(importeCop("automatiza", "anual")).toBe(39_000_000);
    expect(importeCop("acelera", "anual")).toBe(69_000_000);
    expect(importeCop("escala", "anual")).toBe(96_000_000);
  });
});

describe("unidades de Stripe", () => {
  it("COP lleva dos decimales", () => {
    expect(aMenorUnidad(3_900_000)).toBe(390_000_000);
    expect(deMenorUnidad(390_000_000)).toBe(3_900_000);
  });
});

describe("calcularComision", () => {
  it("10% del primer pago", () => {
    expect(calcularComision(6_900_000)).toBe(690_000);
    expect(calcularComision(39_000_000)).toBe(3_900_000);
  });

  it("no genera comisión con bases inválidas", () => {
    expect(calcularComision(0)).toBe(0);
    expect(calcularComision(-5)).toBe(0);
    expect(calcularComision(Number.NaN)).toBe(0);
  });
});

describe("decidirComision", () => {
  const base = {
    referidorId: "r1",
    referidorActivo: true,
    emailReferidor: "ana@correo.com",
    emailComprador: "cliente@empresa.co",
    baseCop: 6_900_000,
  };

  it("aplica con referidor activo", () => {
    expect(decidirComision(base)).toEqual({ aplica: true, montoCop: 690_000 });
  });

  it("no aplica sin referidor", () => {
    expect(decidirComision({ ...base, referidorId: null })).toEqual({ aplica: false, motivo: "sin_referidor" });
  });

  it("no aplica si el referidor está inactivo", () => {
    expect(decidirComision({ ...base, referidorActivo: false })).toEqual({ aplica: false, motivo: "referidor_inactivo" });
  });

  it("bloquea el auto-referido sin importar mayúsculas ni espacios", () => {
    expect(decidirComision({ ...base, emailComprador: "  ANA@correo.com " })).toEqual({
      aplica: false,
      motivo: "auto_referido",
    });
  });
});

describe("minimoHasta", () => {
  it("suma 3 meses por defecto", () => {
    expect(minimoHasta(new Date("2026-10-14T12:00:00Z")).toISOString()).toBe("2027-01-14T12:00:00.000Z");
  });
});

describe("códigos de referido", () => {
  it("normaliza y valida la forma", () => {
    expect(normalizarCodigo(" ac7k2m ")).toBe("AC7K2M");
    expect(normalizarCodigo("ab")).toBeNull();
    expect(normalizarCodigo("con espacio")).toBeNull();
    expect(normalizarCodigo("x".repeat(40))).toBeNull();
    expect(normalizarCodigo(undefined)).toBeNull();
    expect(normalizarCodigo("<script>")).toBeNull();
  });

  it("genera iniciales + 4 caracteres, sin acentos ni símbolos", () => {
    const codigo = generarCodigo("Álvaro Núñez Pérez", () => 0);
    expect(codigo).toBe("ANPAAAA");
    expect(normalizarCodigo(codigo)).toBe(codigo);
  });

  it("cae a IM si el nombre no tiene letras", () => {
    expect(generarCodigo("1234", () => 1).startsWith("IM")).toBe(true);
  });
});

describe("token del panel", () => {
  it("acepta solo 32 hex en minúscula", () => {
    expect(esTokenPanel("a".repeat(32))).toBe(true);
    expect(esTokenPanel("A".repeat(32))).toBe(false);
    expect(esTokenPanel("a".repeat(31))).toBe(false);
    expect(esTokenPanel("../../etc/passwd")).toBe(false);
  });
});

describe("checkoutSchema", () => {
  const valido = {
    plan: "acelera",
    periodo: "mensual",
    nombre: "Ana Pérez",
    empresa: "Tienda Demo",
    email: "ANA@Empresa.co",
    whatsapp: "300 123 4567",
    acepta: true,
  };

  it("normaliza el correo", () => {
    const r = checkoutSchema.safeParse(valido);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("ana@empresa.co");
  });

  it("rechaza plan o periodo fuera del catálogo", () => {
    expect(checkoutSchema.safeParse({ ...valido, plan: "gratis" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valido, periodo: "semanal" }).success).toBe(false);
  });

  it("exige aceptar los términos", () => {
    expect(checkoutSchema.safeParse({ ...valido, acepta: false }).success).toBe(false);
  });
});
