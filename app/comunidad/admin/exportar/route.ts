import { NextResponse } from "next/server";
import { getMiembro } from "@/lib/comunidad/auth";
import { listarAlumnos } from "@/lib/comunidad/queries";
import { toCsv } from "@/lib/comunidad/csv";

export const dynamic = "force-dynamic";

/** CSV con cuentas, programas y fichas. Solo admin; sin sesión de admin responde 404 (no delata la ruta). */
export async function GET() {
  const m = await getMiembro();
  if (!m || m.rol !== "admin") return new NextResponse("Not found", { status: 404 });

  const cuentas = await listarAlumnos();
  const csv = toCsv(
    ["Nombre", "Correo", "WhatsApp", "Rol", "Programas", "Datos aceptados", "Ficha", "Qué vende", "A quién", "Qué quiere"],
    cuentas.map((a) => [
      a.nombre,
      a.email,
      a.whatsapp,
      a.rol,
      a.programas.map((p) => `${p.producto} · ${p.oferta}${p.estado !== "activa" ? " (revocado)" : ""}`).join(" | "),
      a.privacidad ? "Sí" : "No",
      a.fichaCompleta ? "Sí" : "No",
      a.fichaVende,
      a.fichaAQuien,
      a.fichaQuiere,
    ]),
  );

  const fecha = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cuentas-${fecha}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
