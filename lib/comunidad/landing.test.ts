import { describe, expect, it } from "vitest";
import {
  CAMBIO_ENFOQUE,
  COMO_FUNCIONA_ASESORIA,
  CTA,
  ENTREGABLES,
  FAQ_ASESORIA,
  FAQ_OBJECIONES,
  INSTRUCTOR,
  MICROCOPY,
  NO_INCLUYE,
  PARA_QUIEN,
  SECUENCIA,
  TITULARES,
} from "./landing";

/** Todo el texto de las landings en un solo bloque, para comprobar promesas que NO se pueden hacer. */
const TEXTO = JSON.stringify([
  TITULARES,
  CTA,
  MICROCOPY,
  ENTREGABLES,
  CAMBIO_ENFOQUE,
  SECUENCIA,
  INSTRUCTOR,
  NO_INCLUYE,
  PARA_QUIEN,
  FAQ_OBJECIONES,
  FAQ_ASESORIA,
  COMO_FUNCIONA_ASESORIA,
]).toLowerCase();

describe("copy de las landings", () => {
  it("no promete lo que no está aprobado", () => {
    for (const prohibido of [
      "garantiz", // «resultados garantizados» solo aparece negado
      "diagnóstico gratuito",
      "diagnostico gratuito",
      "llamada inmediata",
      "cupo reservado",
      "más vendido",
      "últimas unidades",
      "testimonio de",
      "reembolso",
    ]) {
      const idx = TEXTO.indexOf(prohibido);
      if (idx === -1) continue;
      // «garantiz» solo se admite dentro de la negación explícita de NO_INCLUYE.
      expect(prohibido).toBe("garantiz");
      expect(TEXTO.slice(Math.max(0, idx - 30), idx + 20)).toContain("resultados garantizados");
    }
  });

  it("la cuenta es gratis pero el programa no: ambas variantes lo dicen", () => {
    expect(MICROCOPY.venta).toMatch(/gratis/i);
    expect(MICROCOPY.venta).toMatch(/pagar/i);
    expect(MICROCOPY.asesoria).toMatch(/primero creas tu cuenta/i);
    expect(FAQ_ASESORIA.map((f) => f[1]).join(" ")).toMatch(/programa de pago/i);
  });

  it("la landing de asesoría no promete tiempos de respuesta", () => {
    const asesoria = JSON.stringify([FAQ_ASESORIA, COMO_FUNCIONA_ASESORIA, MICROCOPY.asesoria]).toLowerCase();
    expect(asesoria).not.toMatch(/\b\d+\s*(horas|minutos|días)\b/);
    expect(asesoria).toContain("no te prometemos un tiempo de respuesta");
  });

  it("el CTA público de cada variante coincide con lo acordado", () => {
    expect(CTA.venta.publico).toBe("Crear cuenta para comprar");
    expect(CTA.asesoria.publico).toBe("Crear cuenta y solicitar asesoría");
    expect(CTA.venta.dueno).toBe("Ir a mi programa");
  });

  it("los entregables prometen la guía/plantilla y no el resultado del alumno", () => {
    const web = ENTREGABLES.find((e) => e.clave === "web");
    expect(web?.texto).toMatch(/guía y la plantilla/i);
    expect(web?.nota).toMatch(/depende de que hagas la tarea/i);
  });

  it("deja claro que el plan de Claude no está incluido", () => {
    expect(NO_INCLUYE.join(" ")).toMatch(/plan de pago de claude/i);
  });
});
