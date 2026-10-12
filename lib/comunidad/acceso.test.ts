import { describe, expect, it } from "vitest";
import { destinoPorEstado, inscripcionVigente, rutaDeInteres, rutaInternaPermitida } from "./acceso";

describe("destinoPorEstado (sin guard de pago global)", () => {
  const base = { conSesion: true, tienePerfil: true, privacidadAceptada: true };
  it("sin sesión → login", () => {
    expect(destinoPorEstado({ ...base, conSesion: false })).toBe("/comunidad/login");
  });
  it("usuario global del portal/admin sin perfil del módulo → login (no es miembro)", () => {
    expect(destinoPorEstado({ ...base, tienePerfil: false })).toBe("/comunidad/login");
  });
  it("privacidad pendiente → bienvenida", () => {
    expect(destinoPorEstado({ ...base, privacidadAceptada: false })).toBe("/comunidad/bienvenida");
  });
  it("cuenta verificada → panel, aunque no tenga ninguna compra (no se la manda a la landing en bucle)", () => {
    expect(destinoPorEstado(base)).toBe("/comunidad");
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
  it("sin derecho o fecha inválida no vale", () => {
    expect(inscripcionVigente(null, ahora)).toBe(false);
    expect(inscripcionVigente({ estado: "activa", comunidadVenceEn: "basura" }, ahora)).toBe(false);
  });
});

describe("rutaInternaPermitida (sin open redirect)", () => {
  const ID = "3f2b8c1e-5a4d-4e7b-9c10-1a2b3c4d5e6f";
  it("acepta las rutas internas conocidas", () => {
    for (const ok of ["/comunidad", "/comunidad/mi-cuenta", "/comunidad/programas", "/comunidad/mis-programas", "/comunidad/ficha"]) {
      expect(rutaInternaPermitida(ok)).toBe(ok);
    }
  });
  it("acepta el detalle de un programa y el pedido propio (la página valida al dueño)", () => {
    expect(rutaInternaPermitida("/comunidad/programas/master-ia-360")).toBe("/comunidad/programas/master-ia-360");
    expect(rutaInternaPermitida(`/comunidad/pedidos/${ID}`)).toBe(`/comunidad/pedidos/${ID}`);
  });
  it("rechaza externas, protocolo relativo, admin, query, traversal y slugs/ids mal formados", () => {
    for (const malo of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/comunidad/admin",
      "/comunidad/comercial",
      "/comunidad/ficha?x=1",
      "/comunidad/../admin",
      "/comunidad/programas/../admin",
      "/comunidad/programas/Mayusculas",
      "/comunidad/programas/a/b",
      "/comunidad/pedidos/no-es-uuid",
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

describe("rutaDeInteres", () => {
  it("con programa válido va a su detalle interno; sin intención, al catálogo", () => {
    expect(rutaDeInteres("master-ia-360")).toBe("/comunidad/programas/master-ia-360");
    expect(rutaDeInteres(undefined)).toBe("/comunidad/programas");
    expect(rutaDeInteres("../admin")).toBe("/comunidad/programas");
    expect(rutaDeInteres("X".repeat(80))).toBe("/comunidad/programas");
  });
});
