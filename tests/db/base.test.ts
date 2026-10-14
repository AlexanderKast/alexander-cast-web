import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { freshDb, type TestDb } from "./pg";

let db: TestDb;
beforeAll(async () => {
  db = await freshDb();
});
afterAll(async () => {
  await db.close();
});

describe("migraciones del módulo", () => {
  it("aplican completas y siembran Master IA 360 con sus tres ofertas", async () => {
    const { rows } = await db.pool.query(
      `select o.slug, o.precio_centavos, o.cupos, o.derechos
         from mia_ofertas o join mia_productos p on p.id = o.producto_id
        where p.slug = 'master-ia-360' order by o.orden`,
    );
    expect(rows.map((r) => r.slug)).toEqual(["preventa", "regular", "vip"]);
    expect(rows.map((r) => Number(r.precio_centavos))).toEqual([79_000_000, 129_000_000, 150_000_000]);
    expect(rows[2].cupos).toBe(10);
    expect(rows[0].derechos).toEqual(["sesion_arranque"]);
    expect(rows[1].derechos).toEqual([]);
  });

  it("la cohorte 1 pertenece al producto y tiene tope de 200", async () => {
    const { rows } = await db.pool.query(
      `select c.capacidad, p.slug from mia_cohortes c join mia_productos p on p.id = c.producto_id where c.nombre = 'Cohorte 1'`,
    );
    expect(rows[0]).toMatchObject({ capacidad: 200, slug: "master-ia-360" });
  });
});
