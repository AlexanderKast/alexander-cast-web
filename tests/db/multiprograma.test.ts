import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { abrirVenta, crearCuenta, crearPedido, freshDb, ofertaDe, type TestDb } from "./pg";

let db: TestDb;
beforeAll(async () => {
  db = await freshDb();
  // Hoy puede estar fuera de las fechas reales de la preventa: se abre la venta de las tres ofertas.
  for (const s of ["preventa", "regular", "vip"]) await abrirVenta(db, s);
});
afterAll(async () => {
  await db.close();
});

/** Concede un derecho como lo haría el servidor tras un pago verificado. */
async function conceder(userId: string, ofertaId: string, origen = "pago", por: string | null = null, motivo: string | null = null) {
  const { rows } = await db.pool.query(`select mia_conceder_derecho($1, $2, null, $3, $4, $5) as id`, [userId, ofertaId, origen, por, motivo]);
  return rows[0].id as string;
}

/** Crea un segundo programa publicado (el catálogo es multiprograma; solo MIA360 existe en producción). */
async function crearProducto(slug: string, opts: { tipo?: "programa" | "upsell"; requiere?: string; estado?: string } = {}) {
  const { rows } = await db.pool.query(
    `insert into mia_productos (slug, nombre, tipo, requiere_producto_id, estado) values ($1, $1, $2, $3, $4) returning id`,
    [slug, opts.tipo ?? "programa", opts.requiere ?? null, opts.estado ?? "publicado"],
  );
  return rows[0].id as string;
}
async function crearOferta(productoId: string, slug: string, extra: { cupos?: number; cohorte?: string | null; activa?: boolean } = {}) {
  const { rows } = await db.pool.query(
    `insert into mia_ofertas (producto_id, cohorte_id, slug, nombre, precio_centavos, cupos, activa)
     values ($1, $2, $3, $3, 5000000, $4, $5) returning id`,
    [productoId, extra.cohorte ?? null, slug, extra.cupos ?? null, extra.activa ?? true],
  );
  return rows[0].id as string;
}

describe("cuenta sin compras", () => {
  it("existe como perfil sin pedidos ni derechos (registro ≠ compra ≠ inscripción)", async () => {
    const u = await crearCuenta(db);
    const pedidos = await db.pool.query(`select count(*)::int n from mia_pedidos where user_id = $1`, [u.id]);
    const derechos = await db.pool.query(`select count(*)::int n from mia_inscripciones where user_id = $1`, [u.id]);
    expect(pedidos.rows[0].n).toBe(0);
    expect(derechos.rows[0].n).toBe(0);
  });

  it("puede explorar el catálogo publicado, pero no borradores, y anónimo no ve nada", async () => {
    const u = await crearCuenta(db);
    await crearProducto("borrador-secreto", { estado: "borrador" });
    const visibles = await db.as("authenticated", u.id, (c) => c.query(`select slug from mia_productos order by slug`));
    const slugs = visibles.rows.map((r) => r.slug);
    expect(slugs).toContain("master-ia-360");
    expect(slugs).not.toContain("borrador-secreto");
    await expect(db.as("anon", null, (c) => c.query(`select * from mia_productos`))).rejects.toThrow(/permission denied/);
    await expect(db.as("anon", null, (c) => c.query(`select * from mia_ofertas`))).rejects.toThrow(/permission denied/);
  });
});

describe("crear pedido (compra autenticada)", () => {
  it("crea un pedido PROPIO con el precio de la base y un snapshot de la oferta", async () => {
    const u = await crearCuenta(db, { nombre: "Ana Prueba" });
    const o = await ofertaDe(db, "preventa");
    const r = await crearPedido(db, u.id, o.id);
    expect(r.estado).toBe("ok");
    const { rows } = await db.pool.query(`select * from mia_pedidos where id = $1`, [r.pedido_id]);
    expect(rows[0]).toMatchObject({ user_id: u.id, producto_id: o.producto_id, oferta_id: o.id, estado: "pendiente", historico: false });
    expect(Number(rows[0].monto_centavos)).toBe(79_000_000);
    expect(rows[0].moneda).toBe("cop");
    expect(rows[0].nombre).toBe("Ana Prueba"); // datos del perfil: no se piden otra vez
    expect(rows[0].snapshot.oferta.slug).toBe("preventa");
    expect(rows[0].snapshot.oferta.derechos).toEqual(["sesion_arranque"]);
    expect(rows[0].reservado_hasta).not.toBeNull();
  });

  it("no existe pedido nuevo sin dueño, producto, oferta y snapshot", async () => {
    await expect(
      db.pool.query(
        `insert into mia_pedidos (email, nombre, monto_centavos, privacidad_aceptada_en, nivel) values ('x@y.z','X',100,now(),'regular')`,
      ),
    ).rejects.toThrow(/mia_pedidos_nuevo_ck/);
  });

  it("exige perfil y privacidad aceptada; cuentas ajenas al módulo no compran", async () => {
    const { rows } = await db.pool.query(`insert into auth.users (email) values ('global@portal.local') returning id`);
    const o = await ofertaDe(db, "vip");
    expect((await crearPedido(db, rows[0].id, o.id)).estado).toBe("sin_perfil");
    const sinPriv = await crearCuenta(db, { privacidad: false });
    expect((await crearPedido(db, sinPriv.id, o.id)).estado).toBe("privacidad_pendiente");
  });

  it("respeta la ventana de venta, el estado de la oferta y la publicación del producto", async () => {
    const u = await crearCuenta(db);
    const p = await crearProducto("ventanas");
    const futura = await crearOferta(p, "futura");
    await db.pool.query(`update mia_ofertas set disponible_desde = now() + interval '1 day' where id = $1`, [futura]);
    const vencida = await crearOferta(p, "vencida");
    await db.pool.query(`update mia_ofertas set disponible_hasta = now() - interval '1 minute', disponible_desde = now() - interval '2 days' where id = $1`, [vencida]);
    const apagada = await crearOferta(p, "apagada", { activa: false });
    expect((await crearPedido(db, u.id, futura)).estado).toBe("oferta_cerrada");
    expect((await crearPedido(db, u.id, vencida)).estado).toBe("oferta_cerrada");
    expect((await crearPedido(db, u.id, apagada)).estado).toBe("oferta_no_disponible");

    const borrador = await crearProducto("en-borrador", { estado: "borrador" });
    const ob = await crearOferta(borrador, "x");
    expect((await crearPedido(db, u.id, ob)).estado).toBe("oferta_no_disponible");
    expect((await crearPedido(db, u.id, "00000000-0000-0000-0000-000000000000")).estado).toBe("oferta_no_disponible");
  });

  it("reanuda el pedido abierto de la misma oferta en vez de duplicarlo", async () => {
    const u = await crearCuenta(db);
    const o = await ofertaDe(db, "regular");
    const a = await crearPedido(db, u.id, o.id);
    const b = await crearPedido(db, u.id, o.id);
    expect(b.pedido_id).toBe(a.pedido_id);
    expect(b.reanudado).toBe(true);
    const n = await db.pool.query(`select count(*)::int n from mia_pedidos where user_id = $1 and oferta_id = $2`, [u.id, o.id]);
    expect(n.rows[0].n).toBe(1);
  });
});

describe("varios programas por persona", () => {
  it("comprar Master IA 360 no impide comprar otro programa, y no lo habilita", async () => {
    const u = await crearCuenta(db);
    const mia = await ofertaDe(db, "regular");
    await conceder(u.id, mia.id);

    const b = await crearProducto("programa-b");
    const ob = await crearOferta(b, "unica");
    expect((await crearPedido(db, u.id, ob)).estado).toBe("ok"); // no bloqueado por tener MIA360

    // Y el derecho de MIA360 no abre el programa B.
    const { rows } = await db.pool.query(`select mia_tiene_derecho($1, $2) as t`, [u.id, b]);
    expect(rows[0].t).toBe(false);
    const r2 = await db.pool.query(`select mia_tiene_derecho($1, $2) as t`, [u.id, mia.producto_id]);
    expect(r2.rows[0].t).toBe(true);
  });

  it("bloquea la compra repetida o solapada del mismo programa y cohorte", async () => {
    const u = await crearCuenta(db);
    const mia = await ofertaDe(db, "regular");
    await conceder(u.id, mia.id);
    // Mismo producto y cohorte con OTRA oferta (p. ej. subir a VIP): también es solape.
    const vip = await ofertaDe(db, "vip");
    expect((await crearPedido(db, u.id, mia.id)).estado).toBe("ya_adquirido");
    expect((await crearPedido(db, u.id, vip.id)).estado).toBe("ya_adquirido");
  });

  it("un pago confirmado aún sin derecho también cuenta como ya adquirido", async () => {
    const u = await crearCuenta(db);
    const o = await ofertaDe(db, "preventa");
    const r = await crearPedido(db, u.id, o.id);
    await db.pool.query(`update mia_pedidos set estado = 'pagado' where id = $1`, [r.pedido_id]);
    expect((await crearPedido(db, u.id, o.id)).estado).toBe("ya_adquirido");
  });

  it("una persona puede tener derechos de dos programas a la vez (uno por programa/cohorte)", async () => {
    const u = await crearCuenta(db);
    const mia = await ofertaDe(db, "vip");
    const b = await crearProducto("segundo");
    const ob = await crearOferta(b, "plan");
    await conceder(u.id, mia.id);
    await conceder(u.id, ob);
    const { rows } = await db.pool.query(`select count(*)::int n from mia_inscripciones where user_id = $1 and estado = 'activa'`, [u.id]);
    expect(rows[0].n).toBe(2);
  });
});

describe("upsells con requisitos", () => {
  it("exige un derecho vigente sobre el programa base", async () => {
    const mia = await ofertaDe(db, "regular");
    const up = await crearProducto("upsell-demo", { tipo: "upsell", requiere: mia.producto_id });
    const oup = await crearOferta(up, "extra");
    const sin = await crearCuenta(db);
    expect((await crearPedido(db, sin.id, oup)).estado).toBe("requisito_no_cumplido");

    const con = await crearCuenta(db);
    await conceder(con.id, mia.id);
    expect((await crearPedido(db, con.id, oup)).estado).toBe("ok");
  });

  it("un derecho revocado del programa base ya no cumple el requisito", async () => {
    const mia = await ofertaDe(db, "regular");
    const up = await crearProducto("upsell-demo-2", { tipo: "upsell", requiere: mia.producto_id });
    const oup = await crearOferta(up, "extra");
    const u = await crearCuenta(db);
    await conceder(u.id, mia.id);
    await db.pool.query(`update mia_inscripciones set estado = 'revocada' where user_id = $1`, [u.id]);
    expect((await crearPedido(db, u.id, oup)).estado).toBe("requisito_no_cumplido");
  });
});

describe("cupos y concurrencia", () => {
  it("con un solo cupo, dos compradores simultáneos: uno entra y el otro no", async () => {
    const p = await crearProducto("ultimo-cupo");
    const { rows: c } = await db.pool.query(
      `insert into mia_cohortes (nombre, producto_id, capacidad) values ('Cohorte única', $1, 1) returning id`,
      [p],
    );
    const o = await crearOferta(p, "unica", { cohorte: c[0].id });
    const a = await crearCuenta(db);
    const b = await crearCuenta(db);
    const [ra, rb] = await Promise.all([crearPedido(db, a.id, o), crearPedido(db, b.id, o)]);
    expect([ra.estado, rb.estado].sort()).toEqual(["ok", "sin_cupo"]);
  });

  it("el tope propio de la oferta (VIP) se respeta aunque la cohorte tenga lugar", async () => {
    const p = await crearProducto("tope-oferta");
    const { rows: c } = await db.pool.query(
      `insert into mia_cohortes (nombre, producto_id, capacidad) values ('Cohorte tope', $1, 100) returning id`,
      [p],
    );
    const vip = await crearOferta(p, "vip", { cohorte: c[0].id, cupos: 2 });
    const normal = await crearOferta(p, "normal", { cohorte: c[0].id });
    const cuentas = await Promise.all([crearCuenta(db), crearCuenta(db), crearCuenta(db), crearCuenta(db)]);
    const res = await Promise.all(cuentas.slice(0, 3).map((u) => crearPedido(db, u.id, vip)));
    expect(res.filter((r) => r.estado === "ok")).toHaveLength(2);
    expect(res.filter((r) => r.estado === "sin_cupo")).toHaveLength(1);
    // La oferta normal sigue disponible.
    expect((await crearPedido(db, cuentas[3].id, normal)).estado).toBe("ok");
  });

  it("una reserva vencida libera el cupo; un pedido sin pagar no lo retiene para siempre", async () => {
    const p = await crearProducto("reserva-vence");
    const { rows: c } = await db.pool.query(
      `insert into mia_cohortes (nombre, producto_id, capacidad) values ('Cohorte reserva', $1, 1) returning id`,
      [p],
    );
    const o = await crearOferta(p, "unica", { cohorte: c[0].id });
    const a = await crearCuenta(db);
    const b = await crearCuenta(db);
    const ra = await crearPedido(db, a.id, o);
    expect((await crearPedido(db, b.id, o)).estado).toBe("sin_cupo");
    await db.pool.query(`update mia_pedidos set reservado_hasta = now() - interval '1 minute' where id = $1`, [ra.pedido_id]);
    expect((await crearPedido(db, b.id, o)).estado).toBe("ok");
  });

  it("crear cuenta o abrir una oportunidad NO reserva cupo", async () => {
    const p = await crearProducto("sin-reserva");
    const { rows: c } = await db.pool.query(
      `insert into mia_cohortes (nombre, producto_id, capacidad) values ('Cohorte sin reserva', $1, 1) returning id`,
      [p],
    );
    const o = await crearOferta(p, "unica", { cohorte: c[0].id });
    const curioso = await crearCuenta(db);
    await db.pool.query(
      `insert into mia_oportunidades (user_id, producto_id, oferta_id, contacto_autorizado_en) values ($1, $2, $3, now())`,
      [curioso.id, p, o],
    );
    const comprador = await crearCuenta(db);
    expect((await crearPedido(db, comprador.id, o)).estado).toBe("ok");
  });
});

describe("conceder derechos", () => {
  it("es idempotente y reactiva un derecho revocado", async () => {
    const u = await crearCuenta(db);
    const o = await ofertaDe(db, "preventa");
    const id1 = await conceder(u.id, o.id);
    const id2 = await conceder(u.id, o.id);
    expect(id2).toBe(id1);
    await db.pool.query(`update mia_inscripciones set estado = 'revocada' where id = $1`, [id1]);
    await conceder(u.id, o.id);
    const { rows } = await db.pool.query(`select estado, bonus_clase_privada from mia_inscripciones where id = $1`, [id1]);
    expect(rows[0]).toMatchObject({ estado: "activa", bonus_clase_privada: true });
  });

  it("una concesión manual (admin/cortesía) exige autor y motivo; un pago no", async () => {
    const u = await crearCuenta(db);
    const admin = await crearCuenta(db, { rol: "admin" });
    const o = await ofertaDe(db, "regular");
    await expect(conceder(u.id, o.id, "admin", null, "datáfono")).rejects.toThrow(/autor y motivo/);
    await expect(conceder(u.id, o.id, "cortesia", admin.id, "  ")).rejects.toThrow(/autor y motivo/);
    const id = await conceder(u.id, o.id, "cortesia", admin.id, "Invitado especial");
    const { rows } = await db.pool.query(`select origen, concedido_por, motivo from mia_inscripciones where id = $1`, [id]);
    expect(rows[0]).toMatchObject({ origen: "cortesia", concedido_por: admin.id, motivo: "Invitado especial" });
  });
});
