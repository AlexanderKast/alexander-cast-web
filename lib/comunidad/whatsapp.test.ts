import { describe, expect, it } from "vitest";
import { enlaceWhatsapp } from "./whatsapp";

describe("enlaceWhatsapp", () => {
  it("agrega el 57 a un celular colombiano sin indicativo", () => {
    expect(enlaceWhatsapp("300 123 4567", "hola")).toBe("https://wa.me/573001234567?text=hola");
  });
  it("respeta un indicativo existente y codifica el mensaje", () => {
    expect(enlaceWhatsapp("+1 (555) 123-4567", "a b")).toBe("https://wa.me/15551234567?text=a%20b");
  });
  it("devuelve null con teléfonos vacíos o inválidos", () => {
    expect(enlaceWhatsapp(null, "x")).toBeNull();
    expect(enlaceWhatsapp("123", "x")).toBeNull();
  });
});
