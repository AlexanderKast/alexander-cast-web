import { describe, expect, it } from "vitest";
import { parseAlumnosCsv, parseCsv, toCsv } from "./csv";

describe("parseCsv", () => {
  it("lee comas, comillas y saltos dentro de campos", () => {
    expect(parseCsv('a,b\n"x, y","l1\nl2"\n')).toEqual([
      ["a", "b"],
      ["x, y", "l1\nl2"],
    ]);
  });
  it("detecta punto y coma y BOM", () => {
    expect(parseCsv("﻿a;b\r\n1;2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("parseAlumnosCsv", () => {
  it("acepta encabezados con tildes y valida filas", () => {
    const csv =
      "Nombre,Correo electrónico,WhatsApp,Entrada,Cohorte\nAna Ruiz,ANA@x.co,300 111,VIP,Cohorte 1\n";
    const { filas, errores } = parseAlumnosCsv(csv);
    expect(errores).toEqual([]);
    expect(filas[0]).toMatchObject({ email: "ana@x.co", entrada: "vip", linea: 2 });
  });
  it("reporta entrada inválida, correo malo y repetido", () => {
    const csv =
      "nombre,correo,entrada\nA B,malo,regular\nC D,c@x.co,vip!!\nE F,e@x.co,regular\nG H,e@x.co,vip\n";
    const { filas, errores } = parseAlumnosCsv(csv);
    expect(filas).toHaveLength(1);
    expect(errores.map((e) => e.linea)).toEqual([2, 3, 5]);
  });
  it("pide columnas obligatorias", () => {
    expect(parseAlumnosCsv("nombre,correo\nA,a@x.co\n").errores[0].mensaje).toContain("entrada");
  });
});

describe("toCsv", () => {
  it("escapa comillas y neutraliza fórmulas", () => {
    const out = toCsv(["a"], [["=SUM(A1)"], ['di "hola"']]);
    expect(out).toContain("'=SUM(A1)");
    expect(out).toContain('"di ""hola"""');
  });
});
