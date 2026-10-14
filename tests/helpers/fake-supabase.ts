import type { SupabaseClient } from "@supabase/supabase-js";

/* ── Base en memoria con la parte del cliente de Supabase que usa pedidos.ts ── */

export type Fila = Record<string, unknown>;
type Resultado = { data: unknown; error: { code?: string; message: string } | null };

const UNICOS: Record<string, string> = {
  imt_eventos_stripe: "stripe_event_id",
  imt_comisiones: "pedido_id",
  imt_cobros: "stripe_invoice_id",
  portal_clients: "slug",
};

class Consulta implements PromiseLike<Resultado> {
  private op: "select" | "insert" | "update" | "upsert" = "select";
  private payload: Fila = {};
  private opciones: { onConflict?: string; ignoreDuplicates?: boolean } = {};
  private filtros: ((f: Fila) => boolean)[] = [];
  private devolver = false;
  private tope: number | null = null;

  constructor(
    private tablas: Record<string, Fila[]>,
    private tabla: string,
  ) {}

  insert(p: Fila) {
    this.op = "insert";
    this.payload = p;
    return this;
  }
  update(p: Fila) {
    this.op = "update";
    this.payload = p;
    return this;
  }
  upsert(p: Fila, o: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.op = "upsert";
    this.payload = p;
    this.opciones = o;
    return this;
  }
  select() {
    this.devolver = true;
    return this;
  }
  eq(c: string, v: unknown) {
    this.filtros.push((f) => f[c] === v);
    return this;
  }
  in(c: string, vs: unknown[]) {
    this.filtros.push((f) => vs.includes(f[c]));
    return this;
  }
  ilike(c: string, v: string) {
    // Semántica real de LIKE: % = cualquier cosa, _ = un carácter, \\ escapa el siguiente.
    let re = "";
    for (let i = 0; i < v.length; i++) {
      const ch = v[i];
      if (ch === "\\" && i + 1 < v.length) re += v[++i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      else if (ch === "%") re += ".*";
      else if (ch === "_") re += ".";
      else re += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    const patron = new RegExp(`^${re}$`, "i");
    this.filtros.push((f) => patron.test(String(f[c])));
    return this;
  }
  not(c: string, _op: string, v: unknown) {
    this.filtros.push((f) => (v === null ? f[c] != null : f[c] !== v));
    return this;
  }
  order() {
    return this;
  }
  limit(n: number) {
    this.tope = n;
    return this;
  }
  maybeSingle() {
    return this.ejecutar(true);
  }
  single() {
    return this.ejecutar(true);
  }
  then<A, B>(ok?: (r: Resultado) => A | PromiseLike<A>, fail?: (e: unknown) => B | PromiseLike<B>) {
    return this.ejecutar(false).then(ok, fail);
  }

  private async ejecutar(uno: boolean): Promise<Resultado> {
    const filas = (this.tablas[this.tabla] ??= []);
    const coincide = (f: Fila) => this.filtros.every((fn) => fn(f));
    const unico = UNICOS[this.tabla];

    if (this.op === "insert" || this.op === "upsert") {
      const clave = this.op === "upsert" ? (this.opciones.onConflict ?? unico) : unico;
      const choque = clave && this.payload[clave] != null && filas.some((f) => f[clave] === this.payload[clave]);
      if (choque) {
        if (this.op === "upsert" && this.opciones.ignoreDuplicates) return { data: null, error: null };
        return { data: null, error: { code: "23505", message: "duplicate key" } };
      }
      // Los defaults de estado que pone la migración 0025.
      const porDefecto: Record<string, Fila> = {
        imt_eventos_stripe: { estado: "recibido" },
        imt_comisiones: { estado: "pendiente" },
      };
      const fila = { id: crypto.randomUUID(), ...porDefecto[this.tabla], ...this.payload };
      filas.push(fila);
      return { data: this.devolver ? (uno ? fila : [fila]) : null, error: null };
    }

    if (this.op === "update") {
      const tocadas = filas.filter(coincide);
      tocadas.forEach((f) => Object.assign(f, this.payload));
      return { data: this.devolver ? (uno ? (tocadas[0] ?? null) : tocadas) : null, error: null };
    }

    let sel = filas.filter(coincide);
    if (this.tope !== null) sel = sel.slice(0, this.tope);
    return { data: uno ? (sel[0] ?? null) : sel, error: null };
  }
}

export function crearDb(tablas: Record<string, Fila[]>, auth?: unknown): SupabaseClient {
  return { from: (t: string) => new Consulta(tablas, t), ...(auth ? { auth } : {}) } as unknown as SupabaseClient;
}
