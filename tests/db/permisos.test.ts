import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { abrirVenta, crearCuenta, crearPedido, freshDb, ofertaDe, type TestDb } from "./pg";

let db: TestDb;
beforeAll(async () => {
  db = await freshDb();
  for (const s of ["preventa", "regular", "vip"]) await abrirVenta(db, s);
  // La clase 1 de la cohorte sembrada puede estar en el pasado según el reloj de quien corre la prueba.
  await db.pool.query(`update mia_cohortes set clase1_en = now() + interval '3 days'`);
});
afterAll(async () => {
  await db.close();
});

async function conceder(userId: string, ofertaId: string) {
  const { rows } = await db.pool.query(`select mia_conceder_derecho($1, $2, null, 'pago') as id`, [userId, ofertaId]);
  return rows[0].id as string;
}

describe("pedidos: solo su dueño", () => {
  it("cada cuenta lee únicamente sus pedidos", async () => {
    const a = await crearCuenta(db);
    const b = await crearCuenta(db);
    const o = await ofertaDe(db, "regular");
    const pa = await crearPedido(db, a.id, o.id);
    await crearPedido(db, b.id, o.id);
    const vistosPorA = await db.as("authenticated", a.id, (c) => c.query(`select id, user_id from mia_pedidos`));
    expect(vistosPorA.rows).toHaveLength(1);
    expect(vistosPorA.rows[0]).toMatchObject({ id: pa.pedido_id, user_id: a.id });
  });

  it("la API no puede crear, modificar ni borrar pedidos, derechos ni oportunidades", async () => {
    const a = await crearCuenta(db);
    const o = await ofertaDe(db, "regular");
    const p = await crearPedido(db, a.id, o.id);
    const intentos = [
      `update mia_pedidos set estado = 'pagado' where id = '${p.pedido_id}'`,
      `delete from mia_pedidos where id = '${p.pedido_id}'`,
      `insert into mia_inscripciones (user_id, producto_id, cohorte_id, entrada) values ('${a.id}', '${o.producto_id}', '${o.cohorte_id}', 'vip')`,
      `insert into mia_oportunidades (user_id, producto_id, contacto_autorizado_en) values ('${a.id}', '${o.producto_id}', now())`,
    ];
    for (const sql of intentos) {
      await expect(db.as("authenticated", a.id, (c) => c.query(sql))).rejects.toThrow(/permission denied/);
    }
    // El perfil y la cohorte tampoco se tocan desde la API (nadie se sube el rol a admin).
    await expect(
      db.as("authenticated", a.id, (c) => c.query(`update mia_perfiles set rol = 'admin' where user_id = '${a.id}'`)),
    ).rejects.toThrow(/permission denied/);
    await expect(db.as("authenticated", a.id, (c) => c.query(`update mia_cohortes set capacidad = 99999`))).rejects.toThrow(/permission denied/);
  });

  it("las funciones de crear pedido y conceder derechos no son llamables desde la API", async () => {
    const a = await crearCuenta(db);
    const o = await ofertaDe(db, "regular");
    await expect(
      db.as("authenticated", a.id, (c) => c.query(`select mia_crear_pedido($1, $2)`, [a.id, o.id])),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.as("authenticated", a.id, (c) => c.query(`select mia_conceder_derecho($1, $2, null, 'pago')`, [a.id, o.id])),
    ).rejects.toThrow(/permission denied/);
    await expect(db.as("anon", null, (c) => c.query(`select * from mia_pedidos`))).rejects.toThrow(/permission denied/);
  });
});

describe("derechos y fichas (contenido pagado)", () => {
  it("quien tiene un derecho vigente lee y escribe su ficha; otro alumno no la ve", async () => {
    const a = await crearCuenta(db);
    const b = await crearCuenta(db);
    const o = await ofertaDe(db, "regular");
    const ia = await conceder(a.id, o.id);
    await conceder(b.id, o.id);
    await db.as("authenticated", a.id, (c) =>
      c.query(`insert into mia_fichas (inscripcion_id, vende, a_quien, quiere) values ($1, 'velas', 'mujeres', 'una web')`, [ia]),
    );
    const propia = await db.as("authenticated", a.id, (c) => c.query(`select vende from mia_fichas`));
    expect(propia.rows).toHaveLength(1);
    const ajena = await db.as("authenticated", b.id, (c) => c.query(`select vende from mia_fichas`));
    expect(ajena.rows).toHaveLength(0);
  });

  it("una cuenta sin derecho no escribe fichas aunque conozca el id de una inscripción ajena", async () => {
    const dueno = await crearCuenta(db);
    const intruso = await crearCuenta(db); // cuenta sin compras
    const o = await ofertaDe(db, "preventa");
    const idDueno = await conceder(dueno.id, o.id);
    await expect(
      db.as("authenticated", intruso.id, (c) =>
        c.query(`insert into mia_fichas (inscripcion_id, vende, a_quien, quiere) values ($1, 'hack', 'hack', 'hack')`, [idDueno]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("un derecho revocado o vencido deja de dar acceso a la ficha", async () => {
    const a = await crearCuenta(db);
    const o = await ofertaDe(db, "vip");
    const id = await conceder(a.id, o.id);
    await db.pool.query(`insert into mia_fichas (inscripcion_id, vende, a_quien, quiere) values ($1, 'xxx', 'yyy', 'zzz')`, [id]);
    const antes = await db.as("authenticated", a.id, (c) => c.query(`select 1 from mia_fichas`));
    expect(antes.rows).toHaveLength(1);

    await db.pool.query(`update mia_inscripciones set estado = 'revocada' where id = $1`, [id]);
    const revocado = await db.as("authenticated", a.id, (c) => c.query(`select 1 from mia_fichas`));
    expect(revocado.rows).toHaveLength(0);

    await db.pool.query(`update mia_inscripciones set estado = 'activa', comunidad_vence_en = now() - interval '1 day' where id = $1`, [id]);
    const vencido = await db.as("authenticated", a.id, (c) => c.query(`select 1 from mia_fichas`));
    expect(vencido.rows).toHaveLength(0);
  });

  it("la ficha de un programa no se abre con el derecho de otro programa", async () => {
    const a = await crearCuenta(db);
    const mia = await ofertaDe(db, "regular");
    const { rows: p } = await db.pool.query(`insert into mia_productos (slug, nombre, estado) values ('otro-prog', 'Otro', 'publicado') returning id`);
    const { rows: of } = await db.pool.query(
      `insert into mia_ofertas (producto_id, slug, nombre, precio_centavos) values ($1, 'u', 'U', 100) returning id`,
      [p[0].id],
    );
    // A solo tiene derecho sobre «otro-prog»; no debe poder leer la ficha de una inscripción de Master IA 360.
    await conceder(a.id, of[0].id);
    const dueno = await crearCuenta(db);
    const idMia = await conceder(dueno.id, mia.id);
    await db.pool.query(`insert into mia_fichas (inscripcion_id, vende, a_quien, quiere) values ($1, 'aaa', 'bbb', 'ccc')`, [idMia]);
    const visto = await db.as("authenticated", a.id, (c) => c.query(`select 1 from mia_fichas`));
    expect(visto.rows).toHaveLength(0);
  });

  it("el admin ve fichas; el comercial NO es staff y no las ve (mínimo privilegio)", async () => {
    const alumno = await crearCuenta(db);
    const admin = await crearCuenta(db, { rol: "admin" });
    const comercial = await crearCuenta(db, { rol: "comercial" });
    const o = await ofertaDe(db, "regular");
    const id = await conceder(alumno.id, o.id);
    await db.pool.query(`insert into mia_fichas (inscripcion_id, vende, a_quien, quiere) values ($1, 'aaa', 'bbb', 'ccc')`, [id]);
    expect((await db.as("authenticated", admin.id, (c) => c.query(`select 1 from mia_fichas`))).rows.length).toBeGreaterThan(0);
    expect((await db.as("authenticated", comercial.id, (c) => c.query(`select 1 from mia_fichas`))).rows).toHaveLength(0);
    // El comercial tampoco lee los perfiles ajenos.
    const perfiles = await db.as("authenticated", comercial.id, (c) => c.query(`select user_id from mia_perfiles`));
    expect(perfiles.rows.map((r) => r.user_id)).toEqual([comercial.id]);
  });

  it("el rol comercial existe y un rol inventado se rechaza", async () => {
    const u = await crearCuenta(db);
    await expect(db.pool.query(`update mia_perfiles set rol = 'superadmin' where user_id = $1`, [u.id])).rejects.toThrow(/mia_perfiles_rol_check/);
    await expect(db.pool.query(`update mia_perfiles set rol = 'comercial' where user_id = $1`, [u.id])).resolves.toBeTruthy();
  });
});

describe("oportunidades (venta asistida)", () => {
  async function oportunidad(clienteId: string, asignado: string | null = null) {
    const o = await ofertaDe(db, "regular");
    const { rows } = await db.pool.query(
      `insert into mia_oportunidades (user_id, producto_id, oferta_id, asignado_a, estado, contacto_autorizado_en)
       values ($1, $2, $3, $4, $5, now()) returning id`,
      [clienteId, o.producto_id, o.id, asignado, asignado ? "asignada" : "nueva"],
    );
    return rows[0].id as string;
  }

  it("la ve el cliente, el comercial asignado y el admin; no otro comercial ni otro cliente", async () => {
    const cliente = await crearCuenta(db);
    const otro = await crearCuenta(db);
    const asignado = await crearCuenta(db, { rol: "comercial" });
    const ajeno = await crearCuenta(db, { rol: "comercial" });
    const admin = await crearCuenta(db, { rol: "admin" });
    const id = await oportunidad(cliente.id, asignado.id);
    const ve = async (uid: string) => (await db.as("authenticated", uid, (c) => c.query(`select id from mia_oportunidades where id = $1`, [id]))).rows.length;
    expect(await ve(cliente.id)).toBe(1);
    expect(await ve(asignado.id)).toBe(1);
    expect(await ve(admin.id)).toBe(1);
    expect(await ve(ajeno.id)).toBe(0);
    expect(await ve(otro.id)).toBe(0);
  });

  it("las notas internas las ve el comercial asignado y el admin, no el cliente", async () => {
    const cliente = await crearCuenta(db);
    const asignado = await crearCuenta(db, { rol: "comercial" });
    const id = await oportunidad(cliente.id, asignado.id);
    await db.pool.query(`insert into mia_oportunidad_notas (oportunidad_id, autor, texto) values ($1, $2, 'cliente dudoso')`, [id, asignado.id]);
    const notas = async (uid: string) => (await db.as("authenticated", uid, (c) => c.query(`select texto from mia_oportunidad_notas`))).rows.length;
    expect(await notas(asignado.id)).toBe(1);
    expect(await notas(cliente.id)).toBe(0);
  });

  it("solo hay una oportunidad abierta por cuenta y producto; tras cerrarla se puede abrir otra", async () => {
    const cliente = await crearCuenta(db);
    const id = await oportunidad(cliente.id);
    await expect(oportunidad(cliente.id)).rejects.toThrow(/mia_oportunidades_abierta_idx|duplicate key/);
    await db.pool.query(`update mia_oportunidades set estado = 'perdida' where id = $1`, [id]);
    await expect(oportunidad(cliente.id)).resolves.toBeTruthy();
  });

  it("«ganada» no se puede poner a mano: exige un pedido pagado", async () => {
    const cliente = await crearCuenta(db);
    const id = await oportunidad(cliente.id);
    await expect(db.pool.query(`update mia_oportunidades set estado = 'ganada' where id = $1`, [id])).rejects.toThrow(/pedido pagado/);

    // Con un pedido pendiente (sin pago confirmado) tampoco.
    const o = await ofertaDe(db, "regular");
    const ped = await crearPedido(db, cliente.id, o.id);
    await db.pool.query(`update mia_oportunidades set estado = 'pendiente_pago', pedido_id = $2 where id = $1`, [id, ped.pedido_id]);
    await expect(db.pool.query(`update mia_oportunidades set estado = 'ganada' where id = $1`, [id])).rejects.toThrow(/pedido pagado/);
  });

  it("el pago confirmado SÍ cierra la oportunidad como ganada, sin intervención manual", async () => {
    const cliente = await crearCuenta(db);
    const id = await oportunidad(cliente.id);
    const o = await ofertaDe(db, "regular");
    const { rows } = await db.pool.query(`select mia_crear_pedido($1, $2, null, $3) as r`, [cliente.id, o.id, id]);
    const pedidoId = rows[0].r.pedido_id as string;
    await db.pool.query(`update mia_oportunidades set estado = 'pendiente_pago', pedido_id = $2 where id = $1`, [id, pedidoId]);

    const antes = await db.pool.query(`select estado from mia_oportunidades where id = $1`, [id]);
    expect(antes.rows[0].estado).toBe("pendiente_pago");
    await db.pool.query(`update mia_pedidos set estado = 'pagado' where id = $1`, [pedidoId]);
    const despues = await db.pool.query(`select estado, pedido_id from mia_oportunidades where id = $1`, [id]);
    expect(despues.rows[0]).toMatchObject({ estado: "ganada", pedido_id: pedidoId });
  });

  it("cerrar una oportunidad como ganada o crear el pedido NO concede acceso por sí solo", async () => {
    const cliente = await crearCuenta(db);
    const id = await oportunidad(cliente.id);
    const o = await ofertaDe(db, "preventa");
    await db.pool.query(`select mia_crear_pedido($1, $2, null, $3)`, [cliente.id, o.id, id]);
    const { rows } = await db.pool.query(`select count(*)::int n from mia_inscripciones where user_id = $1`, [cliente.id]);
    expect(rows[0].n).toBe(0); // un pedido pendiente no abre contenido pagado
  });
});
