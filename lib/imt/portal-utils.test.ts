import { describe, expect, it } from "vitest";
import { esSlug, esTokenHash, slugify, sufijoSlug } from "./portal-utils";

describe("slugify", () => {
  it("quita acentos, símbolos y espacios", () => {
    expect(slugify("Tienda Ñandú S.A.S.")).toBe("tienda-nandu-s-a-s");
    expect(slugify("  RIMA GLOBAL SOLUCIONES ")).toBe("rima-global-soluciones");
  });

  it("siempre devuelve un slug válido", () => {
    for (const x of ["", "???", "🔥🔥", "a".repeat(200), "---a---"]) {
      expect(esSlug(slugify(x)), x).toBe(true);
    }
    expect(slugify("???")).toBe("cliente");
  });

  it("limita el largo", () => {
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(48);
  });
});

describe("sufijoSlug", () => {
  it("genera 4 caracteres sin ambiguos", () => {
    expect(sufijoSlug(() => 0)).toBe("aaaa");
    expect(sufijoSlug()).toMatch(/^[a-z2-9]{4}$/);
  });
});

describe("validadores", () => {
  it("esSlug rechaza lo que no sea un slug", () => {
    expect(esSlug("tienda-demo-k7m2")).toBe(true);
    for (const x of ["../admin", "Tienda", "a b", "-a", "a-", "a--b", "", undefined, "a".repeat(65)]) {
      expect(esSlug(x), String(x)).toBe(false);
    }
  });

  it("esTokenHash solo acepta caracteres seguros", () => {
    expect(esTokenHash("a".repeat(40))).toBe(true);
    for (const x of ["corto", "a".repeat(300), "a b c d e f g h i j k l m n o p", "<script>alert(1)</script>", undefined]) {
      expect(esTokenHash(x), String(x)).toBe(false);
    }
  });
});
