import { describe, expect, it } from "vitest";
import { origenPublico } from "./origen";

const RESPALDO = "https://www.alexandercast.online";
const h = (o: Record<string, string>) => ({ get: (k: string) => o[k.toLowerCase()] ?? null });

describe("origenPublico", () => {
  it("usa el dominio de la petición si está permitido", () => {
    expect(origenPublico(h({ host: "www.masteria.cloud" }), RESPALDO)).toBe("https://www.masteria.cloud");
    expect(origenPublico(h({ "x-forwarded-host": "masteria.cloud", host: "otro.vercel.app" }), RESPALDO)).toBe(
      "https://masteria.cloud",
    );
  });

  it("en local usa http y conserva el puerto", () => {
    expect(origenPublico(h({ host: "localhost:3001" }), RESPALDO)).toBe("http://localhost:3001");
  });

  it("un host ajeno o falsificado cae al respaldo", () => {
    expect(origenPublico(h({ host: "evil.com" }), RESPALDO)).toBe(RESPALDO);
    expect(origenPublico(h({ "x-forwarded-host": "evil.com", host: "www.masteria.cloud" }), RESPALDO)).toBe(RESPALDO);
    expect(origenPublico(h({ host: "www.masteria.cloud.evil.com" }), RESPALDO)).toBe(RESPALDO);
  });

  it("sin cabeceras usa el respaldo", () => {
    expect(origenPublico(h({}), RESPALDO)).toBe(RESPALDO);
  });
});
