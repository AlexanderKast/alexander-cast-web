import { beforeEach, describe, expect, it, vi } from "vitest";
import { crearDb, type Fila } from "../../tests/helpers/fake-supabase";

const correo = vi.hoisted(() => ({ acceso: vi.fn(async () => ({ ok: true })) }));
vi.mock("./correo", () => ({ correoAccesoPortal: correo.acceso }));

const stripe = vi.hoisted(() => ({ crearSesion: vi.fn(async () => ({ url: "https://billing.stripe.com/p/session/abc" })) }));
vi.mock("./stripe", () => ({
  getImtStripe: () => ({ billingPortal: { sessions: { create: stripe.crearSesion } } }),
}));

import {
  aprovisionarPortal,
  cargarPanelCliente,
  crearSesionFacturacion,
  generarTokenAcceso,
  reenviarAcceso,
  urlAcceso,
} from "./portal";

const PEDIDO = { id: "11111111-1111-4111-8111-111111111111", email: "Ana@Tienda.co", nombre: "Ana Pérez", empresa: "Tienda Demo S.A.S." };

type Auth = {
  createUser: ReturnType<typeof vi.fn>;
  generateLink: ReturnType<typeof vi.fn>;
};

function authFalso(opciones: { yaExiste?: boolean; falloEnlace?: boolean; tipo?: string } = {}): Auth {
  return {
    createUser: vi.fn(async () =>
      opciones.yaExiste
        ? { data: { user: null }, error: { code: "email_exists", message: "A user with this email address has already been registered" } }
        : { data: { user: { id: "user_1" } }, error: null },
    ),
    generateLink: vi.fn(async () =>
      opciones.falloEnlace
        ? { data: null, error: { message: "boom" } }
        : {
            data: { properties: { hashed_token: "h".repeat(40), verification_type: opciones.tipo ?? "magiclink" }, user: { id: "user_1" } },
            error: null,
          },
    ),
  };
}

const wrap = (a: Auth) => ({ admin: a });

let tablas: Record<string, Fila[]>;

beforeEach(() => {
  tablas = { imt_pedidos: [{ id: PEDIDO.id, portal_client_id: null }], portal_clients: [], portal_client_users: [] };
  vi.clearAllMocks();
  delete process.env.IMT_STRIPE_PORTAL_CONFIGURATION;
});

describe("urlAcceso", () => {
  it("lleva el token y el tipo en la URL del portal", () => {
    expect(urlAcceso("tok".repeat(10), "magiclink", "https://www.masteria.cloud")).toBe(
      `https://www.masteria.cloud/portal/entrar?t=${"tok".repeat(10)}&type=magiclink`,
    );
  });
});

describe("generarTokenAcceso", () => {
  it("crea el usuario confirmado y devuelve el token y su tipo", async () => {
    const auth = authFalso({ tipo: "signup" });
    const r = await generarTokenAcceso(crearDb(tablas, wrap(auth)), "ana@tienda.co");
    expect(auth.createUser).toHaveBeenCalledWith({ email: "ana@tienda.co", email_confirm: true });
    expect(r).toEqual({ userId: "user_1", tokenHash: "h".repeat(40), tipo: "signup" });
  });

  it("un tipo desconocido cae a magiclink", async () => {
    const r = await generarTokenAcceso(crearDb(tablas, wrap(authFalso({ tipo: "invite" }))), "a@b.co");
    expect(r.tipo).toBe("magiclink");
  });

  it("si el usuario ya existe no es un error", async () => {
    const r = await generarTokenAcceso(crearDb(tablas, wrap(authFalso({ yaExiste: true }))), "a@b.co");
    expect(r.userId).toBe("user_1");
  });

  it("si no se puede generar el enlace, lanza", async () => {
    await expect(generarTokenAcceso(crearDb(tablas, wrap(authFalso({ falloEnlace: true }))), "a@b.co")).rejects.toThrow(
      /No se pudo generar el enlace/,
    );
  });
});

describe("aprovisionarPortal", () => {
  it("crea el cliente de IMT, el usuario, vincula el pedido y devuelve el enlace", async () => {
    const auth = authFalso();
    const r = await aprovisionarPortal(crearDb(tablas, wrap(auth)), PEDIDO);

    expect(tablas.portal_clients).toHaveLength(1);
    expect(tablas.portal_clients[0]).toMatchObject({
      nombre: "Tienda Demo S.A.S.",
      slug: "tienda-demo-s-a-s",
      tipo: "imt",
      contacto_email: "ana@tienda.co",
    });
    expect(tablas.portal_client_users).toHaveLength(1);
    expect(tablas.portal_client_users[0]).toMatchObject({ auth_user_id: "user_1", email: "ana@tienda.co", rol: "viewer" });
    expect(tablas.imt_pedidos[0].portal_client_id).toBe(r.clientId);
    expect(r.acceso).toEqual({ tokenHash: "h".repeat(40), tipo: "magiclink" });
  });

  it("si el slug ya existe agrega un sufijo y no choca", async () => {
    tablas.portal_clients = [{ id: "otro", slug: "tienda-demo-s-a-s", tipo: "agencia" }];
    const r = await aprovisionarPortal(crearDb(tablas, wrap(authFalso())), PEDIDO);
    expect(r.slug).toMatch(/^tienda-demo-s-a-s-[a-z2-9]{4}$/);
    expect(tablas.portal_clients).toHaveLength(2);
  });

  it("si la persona ya tiene un portal de IMT lo reutiliza: sin cliente nuevo, sin auth y sin enlace", async () => {
    tablas.portal_client_users = [
      { client_id: "cli_x", email: "ana@tienda.co", activo: true, portal_clients: { id: "cli_x", slug: "tienda-x", tipo: "imt" } },
    ];
    const auth = authFalso();
    const r = await aprovisionarPortal(crearDb(tablas, wrap(auth)), PEDIDO);

    expect(r).toEqual({ clientId: "cli_x", slug: "tienda-x", acceso: null });
    expect(tablas.portal_clients).toHaveLength(0);
    expect(auth.createUser).not.toHaveBeenCalled();
    expect(auth.generateLink).not.toHaveBeenCalled();
    expect(tablas.imt_pedidos[0].portal_client_id).toBe("cli_x");
  });

  it("un portal de agencia con el mismo correo NO se reutiliza: se crea uno de IMT aparte", async () => {
    tablas.portal_client_users = [
      { client_id: "cli_a", email: "ana@tienda.co", activo: true, portal_clients: { id: "cli_a", slug: "agencia-a", tipo: "agencia" } },
    ];
    const r = await aprovisionarPortal(crearDb(tablas, wrap(authFalso())), PEDIDO);
    expect(r.clientId).not.toBe("cli_a");
    expect(tablas.portal_clients[0].tipo).toBe("imt");
  });

  it("un correo que ya tiene usuario en Supabase se vincula igual", async () => {
    const r = await aprovisionarPortal(crearDb(tablas, wrap(authFalso({ yaExiste: true }))), PEDIDO);
    expect(r.acceso).not.toBeNull();
    expect(tablas.portal_client_users[0].auth_user_id).toBe("user_1");
  });
});

describe("correos con comodines de LIKE", () => {
  it("un correo con guion bajo NO se vincula al portal de otro correo parecido", async () => {
    tablas.portal_client_users = [
      { client_id: "cli_x", email: "axb@tienda.co", activo: true, portal_clients: { id: "cli_x", slug: "tienda-x", tipo: "imt" } },
    ];
    const r = await aprovisionarPortal(crearDb(tablas, wrap(authFalso())), { ...PEDIDO, email: "a_b@tienda.co" });
    expect(r.clientId).not.toBe("cli_x");
    expect(r.acceso).not.toBeNull();
    expect(tablas.portal_clients).toHaveLength(1);
  });

  it("ningún comodín (%, _ ni el alias * de PostgREST) coincide con otro correo", async () => {
    tablas.portal_client_users = [{ client_id: "cli_x", email: "ana@tienda.co", nombre: "Ana", activo: true }];
    for (const patron of ["%@tienda.co", "a_a@tienda.co", "*@tienda.co", "ana@*.co", "an*@tienda.co", "%", "*"]) {
      expect(await reenviarAcceso(crearDb(tablas, wrap(authFalso())), patron), patron).toBe(false);
    }
    expect(correo.acceso).not.toHaveBeenCalled();
  });

  it("un correo con * tampoco se vincula al portal de otro al aprovisionar", async () => {
    tablas.portal_client_users = [
      { client_id: "cli_x", email: "ana@tienda.co", activo: true, portal_clients: { id: "cli_x", slug: "tienda-x", tipo: "imt" } },
    ];
    const r = await aprovisionarPortal(crearDb(tablas, wrap(authFalso())), { ...PEDIDO, email: "*@tienda.co" });
    expect(r.clientId).not.toBe("cli_x");
    expect(tablas.portal_clients).toHaveLength(1);
  });

  it("la igualdad es exacta sobre el correo normalizado: mayúsculas y espacios del que pide no importan", async () => {
    tablas.portal_client_users = [{ client_id: "cli_x", email: "ana@tienda.co", nombre: "Ana", activo: true }];
    expect(await reenviarAcceso(crearDb(tablas, wrap(authFalso())), "  ANA@Tienda.CO ")).toBe(true);
  });
});

describe("reenviarAcceso", () => {
  it("un correo sin portal devuelve false y no toca auth ni envía nada", async () => {
    const auth = authFalso();
    const ok = await reenviarAcceso(crearDb(tablas, wrap(auth)), "nadie@x.co", "https://www.masteria.cloud");
    expect(ok).toBe(false);
    expect(auth.generateLink).not.toHaveBeenCalled();
    expect(correo.acceso).not.toHaveBeenCalled();
  });

  it("un correo con portal activo recibe el enlace, sin importar mayúsculas", async () => {
    tablas.portal_client_users = [{ client_id: "cli_x", email: "ana@tienda.co", nombre: "Ana", activo: true }];
    const ok = await reenviarAcceso(crearDb(tablas, wrap(authFalso())), " ANA@Tienda.co ", "https://www.masteria.cloud");
    expect(ok).toBe(true);
    expect(correo.acceso).toHaveBeenCalledOnce();
    const arg = (correo.acceso.mock.calls[0] as unknown as [{ to: string; enlace: string; bienvenida: boolean }])[0];
    expect(arg).toMatchObject({ to: "ana@tienda.co", bienvenida: false });
    expect(arg.enlace).toContain("https://www.masteria.cloud/portal/entrar?t=");
  });

  it("un usuario del portal desactivado no recibe enlace", async () => {
    tablas.portal_client_users = [{ client_id: "cli_x", email: "ana@tienda.co", nombre: "Ana", activo: false }];
    expect(await reenviarAcceso(crearDb(tablas, wrap(authFalso())), "ana@tienda.co")).toBe(false);
  });
});

describe("cargarPanelCliente", () => {
  it("devuelve los planes pagados del cliente con el contrato mínimo y sus cobros", async () => {
    const futuro = new Date(Date.now() + 40 * 24 * 3600 * 1000).toISOString();
    const pasado = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();
    tablas.imt_pedidos = [
      { id: "p1", portal_client_id: "cli_x", estado: "pagado", plan: "acelera", periodo: "mensual", importe_cop: 6_900_000, suscripcion_estado: "activa", pagado_at: pasado, minimo_hasta: futuro, stripe_customer_id: "cus_1" },
      { id: "p2", portal_client_id: "cli_x", estado: "pendiente", plan: "escala", periodo: "anual", importe_cop: 96_000_000 },
      { id: "p3", portal_client_id: "otro", estado: "pagado", plan: "escala", periodo: "anual", importe_cop: 96_000_000, pagado_at: pasado },
    ];
    tablas.imt_cobros = [
      { pedido_id: "p1", monto_cop: 6_900_000, pagado_at: pasado },
      { pedido_id: "p3", monto_cop: 96_000_000, pagado_at: pasado },
    ];
    const r = await cargarPanelCliente(crearDb(tablas), "cli_x");
    expect(r.planes).toHaveLength(1);
    expect(r.planes[0]).toMatchObject({ id: "p1", plan: "acelera", minimoVigente: true, tienePago: true });
    expect(r.cobros).toEqual([{ pedidoId: "p1", montoCop: 6_900_000, pagadoAt: pasado }]);
  });

  it("un cliente sin pagos devuelve listas vacías", async () => {
    expect(await cargarPanelCliente(crearDb(tablas), "nadie")).toEqual({ planes: [], cobros: [] });
  });
});

describe("crearSesionFacturacion", () => {
  it("sin cliente de Stripe devuelve null y no llama a Stripe", async () => {
    tablas.imt_pedidos = [{ id: "p1", portal_client_id: "cli_x", estado: "pagado", stripe_customer_id: null }];
    expect(await crearSesionFacturacion(crearDb(tablas), "cli_x", "tienda-x", "https://www.masteria.cloud")).toBeNull();
    expect(stripe.crearSesion).not.toHaveBeenCalled();
  });

  it("abre el portal del cliente correcto y vuelve al portal", async () => {
    tablas.imt_pedidos = [
      { id: "p1", portal_client_id: "cli_x", estado: "pagado", stripe_customer_id: "cus_1", pagado_at: "2026-10-01T00:00:00Z" },
      { id: "p2", portal_client_id: "otro", estado: "pagado", stripe_customer_id: "cus_OTRO", pagado_at: "2026-10-02T00:00:00Z" },
    ];
    const url = await crearSesionFacturacion(crearDb(tablas), "cli_x", "tienda-x", "https://www.masteria.cloud");
    expect(url).toBe("https://billing.stripe.com/p/session/abc");
    expect(stripe.crearSesion).toHaveBeenCalledWith({ customer: "cus_1", return_url: "https://www.masteria.cloud/portal/tienda-x" });
  });

  it("usa la configuración del portal si está definida", async () => {
    process.env.IMT_STRIPE_PORTAL_CONFIGURATION = "bpc_123";
    tablas.imt_pedidos = [{ id: "p1", portal_client_id: "cli_x", estado: "pagado", stripe_customer_id: "cus_1" }];
    await crearSesionFacturacion(crearDb(tablas), "cli_x", "tienda-x", "https://www.masteria.cloud");
    expect(stripe.crearSesion).toHaveBeenCalledWith(expect.objectContaining({ configuration: "bpc_123" }));
  });
});
