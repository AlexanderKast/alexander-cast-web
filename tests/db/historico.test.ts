import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dbAnteriorAlMultiprograma } from "./pg";

let h: Awaited<ReturnType<typeof dbAnteriorAlMultiprograma>>;
const ids: Record<string, string> = {};

beforeAll(async () => {
  h = await dbAnteriorAlMultiprograma();

  // Datos «de antes» (esquema anterior): alumnos de las tres entradas, una ficha y pedidos de compra invitada.
  const { rows: coh } = await h.pool.query(`select id from mia_cohortes where nombre = 'Cohorte 1'`);
  const cohorte = coh[0].id as string;
  for (const [clave, entrada] of [["a", "preventa"], ["b", "regular"], ["c", "vip"]] as const) {
    const u = await h.pool.query(`insert into auth.users (email) values ($1) returning id`, [`${clave}@antes.local`]);
    ids[clave] = u.rows[0].id;
    await h.pool.query(
      `insert into mia_perfiles (user_id, email, nombre, privacidad_aceptada_en) values ($1, $2, $3, now())`,
      [ids[clave], `${clave}@antes.local`, `Alumno ${clave}`],
    );
    const i = await h.pool.query(
      `insert into mia_inscripciones (user_id, cohorte_id, entrada, bonus_clase_privada) values ($1, $2, $3, $4) returning id`,
      [ids[clave], cohorte, entrada, entrada !== "regular"],
    );
    ids[`insc_${clave}`] = i.rows[0].id;
  }
  await h.pool.query(`insert into mia_fichas (inscripcion_id, vende, a_quien, quiere) values ($1, 'velas', 'mujeres', 'una web')`, [ids.insc_a]);

  // Pedidos de la compra invitada: uno pagado (con su precio real) y uno que nunca pagó.
  const pagado = await h.pool.query(
    `insert into mia_pedidos (email, nombre, whatsapp, monto_centavos, moneda, estado, nivel, privacidad_aceptada_en, stripe_payment_intent, pagado_en)
     values ('invitado@antes.local', 'Invitado Pagó', '+573000000000', 79000000, 'cop', 'pagado', 'preventa', now(), 'pi_hist_1', now()) returning id`,
  );
  ids.pedido_pagado = pagado.rows[0].id;
  const abandonado = await h.pool.query(
    `insert into mia_pedidos (email, nombre, monto_centavos, moneda, estado, nivel, privacidad_aceptada_en)
     values ('curioso@antes.local', 'Curioso', 129000000, 'cop', 'abandonado', 'regular', now()) returning id`,
  );
  ids.pedido_abandonado = abandonado.rows[0].id;

  await h.aplicarMultiprograma();
});
afterAll(async () => {
  await h.close();
});

describe("migración de datos históricos a Master IA 360", () => {
  it("todos los derechos existentes quedan en el producto, con su oferta y origen histórico", async () => {
    const { rows } = await h.pool.query(
      `select i.entrada, i.estado, i.origen, i.derechos, i.oferta_id, p.slug producto, o.slug oferta
         from mia_inscripciones i
         join mia_productos p on p.id = i.producto_id
         join mia_ofertas o on o.id = i.oferta_id
        order by i.entrada`,
    );
    expect(rows).toHaveLength(3);
    for (const r of rows) {
      expect(r.producto).toBe("master-ia-360");
      expect(r.origen).toBe("historico");
      expect(r.estado).toBe("activa");
      expect(r.oferta).toBe(r.entrada);
    }
    expect(rows.find((r) => r.entrada === "vip")?.derechos).toContain("sesion_1a1");
    expect(rows.find((r) => r.entrada === "regular")?.derechos).toEqual([]);
  });

  it("conserva las fichas y siguen ligadas a su derecho", async () => {
    const { rows } = await h.pool.query(`select vende from mia_fichas where inscripcion_id = $1`, [ids.insc_a]);
    expect(rows[0].vende).toBe("velas");
  });

  it("los pedidos históricos se marcan como tales y conservan precio, estado y pago", async () => {
    const { rows } = await h.pool.query(
      `select id, historico, estado, monto_centavos, user_id, producto_id, oferta_id, stripe_payment_intent, snapshot
         from mia_pedidos where id = any($1)`,
      [[ids.pedido_pagado, ids.pedido_abandonado]],
    );
    const pagado = rows.find((r) => r.id === ids.pedido_pagado);
    const abandonado = rows.find((r) => r.id === ids.pedido_abandonado);
    expect(pagado).toMatchObject({ historico: true, estado: "pagado", stripe_payment_intent: "pi_hist_1" });
    expect(Number(pagado.monto_centavos)).toBe(79_000_000); // lo que realmente se cobró
    expect(pagado.user_id).toBeNull(); // compra invitada: sigue sin dueño verificado
    expect(pagado.producto_id).not.toBeNull();
    expect(pagado.oferta_id).not.toBeNull();
    expect(pagado.snapshot.historico).toBe(true);
    expect(abandonado).toMatchObject({ historico: true, estado: "abandonado" });
  });

  it("los pedidos nuevos ya no pueden nacer sin dueño; los históricos siguen siendo válidos", async () => {
    await expect(
      h.pool.query(`insert into mia_pedidos (email, nombre, monto_centavos, privacidad_aceptada_en, nivel) values ('n@x.z','N',1,now(),'regular')`),
    ).rejects.toThrow(/mia_pedidos_nuevo_ck/);
  });

  it("no se pierde ni se duplica nada", async () => {
    const q = async (t: string) => Number((await h.pool.query(`select count(*) n from ${t}`)).rows[0].n);
    expect(await q("mia_inscripciones")).toBe(3);
    expect(await q("mia_pedidos")).toBe(2);
    expect(await q("mia_perfiles")).toBe(3);
    expect(await q("mia_productos")).toBe(1);
    expect(await q("mia_ofertas")).toBe(3);
  });

  it("los roles existentes no se tocan", async () => {
    const { rows } = await h.pool.query(`select distinct rol from mia_perfiles`);
    expect(rows.map((r) => r.rol)).toEqual(["alumno"]);
  });
});
