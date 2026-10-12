
/** Quita tildes y pasa a minúsculas para comparar encabezados y valores. */
function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();
}

/**
 * Parser CSV mínimo (RFC 4180): comillas, comillas escapadas ("") y saltos
 * de línea dentro de campos. Detecta si el archivo usa coma o punto y coma
 * (Excel en español exporta con ';'). Ignora el BOM.
 */
export function parseCsv(texto: string): string[][] {
  const limpio = texto.replace(/^﻿/, "");
  const primeraLinea = limpio.split(/\r?\n/, 1)[0] ?? "";
  const sep =
    (primeraLinea.match(/;/g)?.length ?? 0) > (primeraLinea.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";

  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let entreComillas = false;

  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (entreComillas) {
      if (c === '"') {
        if (limpio[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === sep) {
      fila.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && limpio[i + 1] === "\n") i++;
      fila.push(campo);
      campo = "";
      if (fila.some((x) => x.trim() !== "")) filas.push(fila);
      fila = [];
    } else {
      campo += c;
    }
  }
  fila.push(campo);
  if (fila.some((x) => x.trim() !== "")) filas.push(fila);
  return filas;
}

/**
 * Evita inyección de fórmulas al abrir el CSV en Excel/Sheets: un valor que
 * empieza con = + - @ (o tab/CR) se prefija con apóstrofo.
 */
function protegerFormula(valor: string): string {
  return /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
}

export function toCsv(encabezados: string[], filas: (string | null | undefined)[][]): string {
  const celda = (v: string | null | undefined) => {
    const s = protegerFormula(v ?? "");
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lineas = [encabezados, ...filas].map((f) => f.map(celda).join(","));
  // BOM para que Excel respete los acentos.
  return "﻿" + lineas.join("\r\n") + "\r\n";
}

type Campo = "nombre" | "email" | "whatsapp" | "entrada" | "cohorte";

export interface FilaAlumnoCsv {
  linea: number;
  nombre: string;
  email: string;
  whatsapp: string;
  /** Slug de la oferta (p. ej. preventa, regular, vip); se resuelve contra el programa elegido. */
  entrada: string;
  cohorte: string; // ignorada: la cohorte la define la oferta
}
export interface ErrorCsv {
  linea: number;
  mensaje: string;
}

const COLUMNAS: Record<string, Campo> = {
  nombre: "nombre",
  correo: "email",
  email: "email",
  "correo electronico": "email",
  whatsapp: "whatsapp",
  celular: "whatsapp",
  telefono: "whatsapp",
  entrada: "entrada",
  tipo: "entrada",
  cohorte: "cohorte",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_FILAS_CSV = 500;

export function parseAlumnosCsv(texto: string): {
  filas: FilaAlumnoCsv[];
  errores: ErrorCsv[];
} {
  const crudo = parseCsv(texto);
  const errores: ErrorCsv[] = [];
  if (crudo.length === 0) {
    return { filas: [], errores: [{ linea: 1, mensaje: "El archivo está vacío." }] };
  }

  const indice = new Map<Campo, number>();
  crudo[0].forEach((h, i) => {
    const campo = COLUMNAS[normalizar(h)];
    if (campo && !indice.has(campo)) indice.set(campo, i);
  });
  for (const requerida of ["nombre", "email", "entrada"] as const) {
    if (!indice.has(requerida)) {
      errores.push({
        linea: 1,
        mensaje: `Falta la columna "${requerida === "email" ? "correo" : requerida}".`,
      });
    }
  }
  if (errores.length) return { filas: [], errores };

  const datos = crudo.slice(1);
  if (datos.length > MAX_FILAS_CSV) {
    return {
      filas: [],
      errores: [{ linea: 1, mensaje: `Máximo ${MAX_FILAS_CSV} filas por archivo.` }],
    };
  }

  const filas: FilaAlumnoCsv[] = [];
  const vistos = new Set<string>();
  const valor = (f: string[], c: Campo) => (f[indice.get(c) ?? -1] ?? "").trim();

  datos.forEach((f, i) => {
    const linea = i + 2;
    const nombre = valor(f, "nombre");
    const email = valor(f, "email").toLowerCase();
    const entrada = normalizar(valor(f, "entrada")).replace(/\s+/g, "-");

    if (nombre.length < 2) {
      errores.push({ linea, mensaje: "Nombre vacío o muy corto." });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      errores.push({ linea, mensaje: `Correo no válido: "${email}".` });
      return;
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(entrada)) {
      errores.push({ linea, mensaje: "Falta la entrada (por ejemplo: preventa, regular o vip)." });
      return;
    }
    if (vistos.has(email)) {
      errores.push({ linea, mensaje: `Correo repetido en el archivo: ${email}.` });
      return;
    }
    vistos.add(email);

    filas.push({
      linea,
      nombre,
      email,
      whatsapp: valor(f, "whatsapp"),
      entrada,
      cohorte: valor(f, "cohorte"),
    });
  });

  return { filas, errores };
}
