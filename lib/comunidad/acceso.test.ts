import { describe, expect, it } from "vitest";
import { destinoPorEstado, inscripcionVigente, rutaInternaPermitida } from "./acceso";

describe("destinoPorEstado", () => {
  const base = { conSesion: true, tienePerfil: true, inscripcionVigente: true, privacidadAceptada: true };
  it("sin sesión → login", () => {
    expect(destinoPorEstado({ ...base, conSesion: false })).toBe("/comunidad/login");
  });
  it("usuario global sin perfil del módulo → login (no es miembro)", () => {
    expect(destinoPorEstado({ ...base, tienePerfil: false })).toBe("/comunidad/login");
  });
  it("cuenta sin inscripción vigente → mi cuenta (aunque ya haya aceptado privacidad)", () => {
    expect(destinoPorEstado({ ...base, inscripcionVigente: false })).toBe("/comunidad/mi-cuenta");
  });
  it("inscripción vigente con privacidad pendiente → bienvenida", () => {
    expect(destinoPorEstado({ ...base, privacidadAceptada: false })).toBe("/comunidad/bienvenida");
  });
  it("alumno vigente → comunidad", () => {
    expect(destinoPorEstado(base)).toBe("/comunidad");
  });
  it("sin inscripción vigente nunca llega a rutas pagadas, con o sin privacidad", () => {
    for (const priv of [true, false]) {
      const d = destinoPorEstado({ ...base, inscripcionVigente: false, privacidadAceptada: priv });
      expect(d).toBe("/comunidad/mi-cuenta");
    }
  });
});

describe("inscripcionVigente", () => {
  const ahora = new Date("2026-11-01T12:00:00-05:00");
  it("activa sin vencimiento vale", () => {
    expect(inscripcionVigente({ estado: "activa", comunidadVenceEn: null }, ahora)).toBe(true);
  });
  it("activa con vencimiento futuro vale; vencida no", () => {
    expect(inscripcionVigente({ estado: "activa", comunidadVenceEn: "2026-12-01T00:00:00-05:00" }, ahora)).toBe(true);
    expect(inscripcionVigente({ estado: "activa", comunidadVenceEn: "2026-10-31T00:00:00-05:00" }, ahora)).toBe(false);
  });
  it("revocada (reembolso total / disputa) no vale, aunque no haya vencido", () => {
    expect(inscripcionVigente({ estado: "revocada", comunidadVenceEn: null }, ahora)).toBe(false);
  });
  it("sin inscripción o fecha inválida no vale", () => {
    expect(inscripcionVigente(null, ahora)).toBe(false);
    expect(inscripcionVigente({ estado: "activa", comunidadVenceEn: "basura" }, ahora)).toBe(false);
  });
});

describe("rutaInternaPermitida (sin open redirect)", () => {
  it("acepta solo rutas de la lista", () => {
    expect(rutaInternaPermitida("/comunidad/ficha")).toBe("/comunidad/ficha");
    expect(rutaInternaPermitida("/comunidad/mi-cuenta")).toBe("/comunidad/mi-cuenta");
  });
  it("rechaza URLs externas, protocolo relativo, rutas admin y variaciones", () => {
    for (const malo of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/comunidad/admin",
      "/comunidad/ficha?x=1",
      "/comunidad/../admin",
      "javascript:alert(1)",
      "",
      null,
      undefined,
      42,
    ]) {
      expect(rutaInternaPermitida(malo)).toBeNull();
    }
  });
});
