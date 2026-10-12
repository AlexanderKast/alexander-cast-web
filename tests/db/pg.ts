import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { inject } from "vitest";

const TEMPLATE_DB = "mia_template";

export interface TestDb {
  name: string;
  /** Pool como superusuario (equivale a service_role + SQL Editor). */
  pool: pg.Pool;
  /** Ejecuta fn con el rol y el usuario de la API (RLS activo). */
  as<T>(role: "anon" | "authenticated", userId: string | null, fn: (c: pg.PoolClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** Crea una base aislada a partir de la plantilla con todas las migraciones del módulo. */
export async function freshDb(): Promise<TestDb> {
  const port = inject("pgPort");
  const base = { host: "127.0.0.1", port, user: "postgres", password: "postgres" };
  const name = `t_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const admin = new pg.Client({ ...base, database: "postgres" });
  await admin.connect();
  await admin.query(`create database ${name} template ${TEMPLATE_DB}`);
  await admin.end();
  const pool = new pg.Pool({ ...base, database: name, max: 12 });

  return {
    name,
    pool,
    async as(role, userId, fn) {
      const c = await pool.connect();
      try {
        await c.query("begin");
        await c.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? ""]);
        await c.query(`set local role ${role}`);
        const out = await fn(c);
        await c.query("commit");
        return out;
      } catch (e) {
        await c.query("rollback").catch(() => {});
        throw e;
      } finally {
        c.release();
      }
    },
    async close() {
      await pool.end();
      const a = new pg.Client({ ...base, database: "postgres" });
      await a.connect();
      await a.query(`drop database if exists ${name} with (force)`);
      await a.end();
    },
  };
}

/** Cuenta verificada (auth.users) con perfil del módulo. */
export async function crearCuenta(
  db: TestDb,
  opts: { rol?: "alumno" | "moderador" | "admin" | "comercial"; nombre?: string; privacidad?: boolean; email?: string } = {},
) {
  const email = opts.email ?? `${randomUUID().slice(0, 8)}@prueba.local`;
  const { rows } = await db.pool.query(`insert into auth.users (email) values ($1) returning id`, [email]);
  const id = rows[0].id as string;
  await db.pool.query(
    `insert into mia_perfiles (user_id, email, nombre, rol, privacidad_aceptada_en)
     values ($1, $2, $3, $4, $5)`,
    [id, email, opts.nombre ?? "Persona de Prueba", opts.rol ?? "alumno", opts.privacidad === false ? null : new Date().toISOString()],
  );
  return { id, email };
}

/** Datos sembrados por la migración para Master IA 360 (cohorte 1 y sus tres ofertas). */
export async function ofertaDe(db: TestDb, slug: "preventa" | "regular" | "vip") {
  const { rows } = await db.pool.query(
    `select o.id, o.producto_id, o.cohorte_id from mia_ofertas o
       join mia_productos p on p.id = o.producto_id where p.slug = 'master-ia-360' and o.slug = $1`,
    [slug],
  );
  return rows[0] as { id: string; producto_id: string; cohorte_id: string };
}

/** Ajusta la ventana de venta de una oferta (para probar con fechas reales sin depender de hoy). */
export async function abrirVenta(db: TestDb, ofertaSlug: string, productoSlug = "master-ia-360") {
  await db.pool.query(
    `update mia_ofertas set disponible_desde = now() - interval '1 day', disponible_hasta = now() + interval '1 day'
      where slug = $1 and producto_id = (select id from mia_productos where slug = $2)`,
    [ofertaSlug, productoSlug],
  );
}

export async function crearPedido(db: TestDb, userId: string, ofertaId: string) {
  const { rows } = await db.pool.query(`select mia_crear_pedido($1, $2) as r`, [userId, ofertaId]);
  return rows[0].r as { estado: string; pedido_id?: string; reanudado?: boolean };
}

/**
 * Base con el esquema ANTERIOR al multiprograma (migraciones hasta 0023) para probar la migración
 * de datos históricos: se insertan filas «de antes» y luego se aplica 0024.
 */
export async function dbAnteriorAlMultiprograma() {
  const port = inject("pgPort");
  const base = { host: "127.0.0.1", port, user: "postgres", password: "postgres" };
  const name = `h_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const admin = new pg.Client({ ...base, database: "postgres" });
  await admin.connect();
  await admin.query(`create database ${name} encoding 'UTF8' template template0`);
  await admin.end();
  const pool = new pg.Pool({ ...base, database: name, max: 4 });

  const dir = path.resolve(__dirname, "../../supabase/migrations");
  const archivos = readdirSync(dir)
    .filter((f) => f.endsWith(".sql") && /(comunidad|mia_)/.test(f))
    .sort();
  await pool.query(readFileSync(path.join(__dirname, "supabase-shim.sql"), "utf8"));
  for (const f of archivos.filter((x) => x < "0024")) await pool.query(readFileSync(path.join(dir, f), "utf8"));

  return {
    pool,
    async aplicarMultiprograma() {
      for (const f of archivos.filter((x) => x >= "0024")) await pool.query(readFileSync(path.join(dir, f), "utf8"));
    },
    async close() {
      await pool.end();
      const a = new pg.Client({ ...base, database: "postgres" });
      await a.connect();
      await a.query(`drop database if exists ${name} with (force)`);
      await a.end();
    },
  };
}
