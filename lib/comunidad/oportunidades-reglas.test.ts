import { describe, expect, it } from "vitest";
import {
  puedeAsignar,
  puedeCrearPedido,
  puedeGestionar,
  puedeVer,
  transicionManual,
  type Actor,
  type OportunidadLite,
} from "./oportunidades-reglas";

const admin: Actor = { userId: "u-admin", rol: "admin" };
const comercialA: Actor = { userId: "u-ca", rol: "comercial" };
const comercialB: Actor = { userId: "u-cb", rol: "comercial" };
const cliente: Actor = { userId: "u-cli", rol: "alumno" };
const opp = (o: Partial<OportunidadLite> = {}): OportunidadLite => ({ userId: "u-cli", asignadoA: "u-ca", estado: "contactada", ...o });

describe("visibilidad y gestión", () => {
  it("la ve el cliente, el comercial asignado y el admin; no otro comercial ni otra cuenta", () => {
    expect(puedeVer(cliente, opp())).toBe(true);
    expect(puedeVer(comercialA, opp())).toBe(true);
    expect(puedeVer(admin, opp())).toBe(true);
    expect(puedeVer(comercialB, opp())).toBe(false);
    expect(puedeVer({ userId: "otro", rol: "alumno" }, opp())).toBe(false);
  });

  it("gestionan el admin y el comercial asignado; el cliente y otro comercial, no", () => {
    expect(puedeGestionar(admin, opp())).toBe(true);
    expect(puedeGestionar(comercialA, opp())).toBe(true);
    expect(puedeGestionar(comercialB, opp())).toBe(false);
    expect(puedeGestionar(cliente, opp())).toBe(false);
    expect(puedeGestionar(comercialA, opp({ asignadoA: null }))).toBe(false); // sin asignar: nadie «la toma» solo
  });

  it("solo el admin asigna oportunidades", () => {
    expect(puedeAsignar(admin)).toBe(true);
    expect(puedeAsignar(comercialA)).toBe(false);
    expect(puedeAsignar(cliente)).toBe(false);
  });
});

describe("transiciones", () => {
  it("«ganada» no se puede poner a mano, ni siquiera el admin: la deriva el pago", () => {
    for (const actor of [admin, comercialA]) {
      const r = transicionManual(actor, opp({ estado: "pendiente_pago" }), "ganada");
      expect(r.ok).toBe(false);
    }
  });

  it("el comercial asignado avanza el embudo; otro comercial no", () => {
    expect(transicionManual(comercialA, opp({ estado: "contactada" }), "propuesta")).toEqual({ ok: true });
    expect(transicionManual(comercialA, opp({ estado: "propuesta" }), "pendiente_pago")).toEqual({ ok: true });
    expect(transicionManual(comercialB, opp({ estado: "contactada" }), "propuesta").ok).toBe(false);
    expect(transicionManual(cliente, opp({ estado: "contactada" }), "perdida").ok).toBe(false);
  });

  it("asignar es solo del admin", () => {
    expect(transicionManual(admin, opp({ estado: "nueva", asignadoA: null }), "asignada")).toEqual({ ok: true });
    expect(transicionManual(comercialA, opp({ estado: "nueva" }), "asignada").ok).toBe(false);
  });

  it("se puede perder desde cualquier estado abierto; lo cerrado no se reabre", () => {
    expect(transicionManual(comercialA, opp({ estado: "propuesta" }), "perdida")).toEqual({ ok: true });
    expect(transicionManual(admin, opp({ estado: "perdida" }), "contactada").ok).toBe(false);
    expect(transicionManual(admin, opp({ estado: "ganada" }), "perdida").ok).toBe(false);
  });

  it("no se saltan pasos inválidos", () => {
    expect(transicionManual(admin, opp({ estado: "nueva", asignadoA: null }), "pendiente_pago").ok).toBe(false);
  });
});

describe("crear pedido desde la oportunidad", () => {
  const conOferta = (o: Partial<OportunidadLite> = {}) => ({ ...opp(o), ofertaId: "of-1" as string | null });
  it("lo crea quien la gestiona, abierta y con oferta", () => {
    expect(puedeCrearPedido(comercialA, conOferta())).toEqual({ ok: true });
    expect(puedeCrearPedido(admin, conOferta())).toEqual({ ok: true });
  });
  it("no lo crea quien no la gestiona, ni si está cerrada o sin oferta", () => {
    expect(puedeCrearPedido(comercialB, conOferta()).ok).toBe(false);
    expect(puedeCrearPedido(cliente, conOferta()).ok).toBe(false);
    expect(puedeCrearPedido(comercialA, conOferta({ estado: "perdida" })).ok).toBe(false);
    expect(puedeCrearPedido(comercialA, { ...opp(), ofertaId: null }).ok).toBe(false);
  });
});
