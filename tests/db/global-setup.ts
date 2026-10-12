import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import type { TestProject } from "vitest/node";

const ROOT = path.resolve(__dirname, "../..");
export const TEMPLATE_DB = "mia_template";

/**
 * embedded-postgres registra async-exit-hook, que en `beforeExit` llama a process.exit(0) y
 * PISA el código de salida 1 de vitest cuando hay pruebas fallidas. Se quita para no dar un
 * falso verde; los ganchos de señales (Ctrl+C) se conservan para no dejar procesos huérfanos.
 */
function keepVitestExitCode() {
  const exitHook = createRequire(import.meta.url)("async-exit-hook") as { unhookEvent(event: string): void };
  exitHook.unhookEvent("beforeExit");
  exitHook.unhookEvent("exit");
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const port = (srv.address() as { port: number }).port;
      srv.close(() => resolve(port));
    });
  });
}

/**
 * Solo las migraciones del módulo de comunidad (mia_*): el resto del sitio (0001–0016, 0018) depende
 * de tablas y extensiones que no forman parte de lo que se prueba aquí.
 */
function migracionesDelModulo(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql") && /(comunidad|mia_)/.test(f))
    .sort();
}

async function buildTemplate(port: number) {
  const admin = new pg.Client({ host: "127.0.0.1", port, user: "postgres", password: "postgres", database: "postgres" });
  await admin.connect();
  await admin.query(`drop database if exists ${TEMPLATE_DB}`);
  await admin.query(`create database ${TEMPLATE_DB} encoding 'UTF8' template template0`);
  await admin.end();

  const db = new pg.Client({ host: "127.0.0.1", port, user: "postgres", password: "postgres", database: TEMPLATE_DB });
  await db.connect();
  await db.query(readFileSync(path.join(__dirname, "supabase-shim.sql"), "utf8"));
  const dir = path.join(ROOT, "supabase/migrations");
  for (const file of migracionesDelModulo(dir)) {
    try {
      await db.query(readFileSync(path.join(dir, file), "utf8"));
    } catch (e) {
      throw new Error(`Migración ${file} falló: ${(e as Error).message}`);
    }
  }
  await db.end();
}

export default async function setup(project: TestProject) {
  const dataDir = mkdtempSync(path.join(tmpdir(), "mia-pg-"));
  const port = await freePort();
  const server = new EmbeddedPostgres({
    databaseDir: dataDir,
    port,
    user: "postgres",
    password: "postgres",
    persistent: false,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: () => {},
    onError: () => {},
  });
  await server.initialise();
  await server.start();
  try {
    await buildTemplate(port);
  } catch (e) {
    await server.stop();
    rmSync(dataDir, { recursive: true, force: true });
    throw e;
  }
  project.provide("pgPort", port);

  keepVitestExitCode();
  return async () => {
    await server.stop();
    try {
      rmSync(dataDir, { recursive: true, force: true });
    } catch {
      /* Windows puede retener el directorio unos segundos; es temporal. */
    }
  };
}

declare module "vitest" {
  export interface ProvidedContext {
    pgPort: number;
  }
}
