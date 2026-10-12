import { NextResponse } from "next/server";
import { getMiembro } from "@/lib/comunidad/auth";
import { listarAlumnos } from "@/lib/comunidad/queries";
import { toCsv } from "@/lib/comunidad/csv";
import { ENTRADA_LABEL } from "@/lib/comunidad/validators";

export const dynamic = "force-dynamic";

/** CSV con alumnos y fichas. Solo admin; sin sesión de admin responde 404 (no delata la ruta). */
export async function GET() {
  const m = await getMiembro();
  if (!m || m.rol !== "admin") return new NextResponse("Not found", { status: 404 });

  const alumnos = await listarAlumnos();
  const csv = toCsv(
    ["Nombre", "Correo", "WhatsApp", "Entrada", "Cohorte", "Entró", "Ficha", "Qué vende", "A quién", "Qué quiere"],
    alumnos.map((a) => [
      a.nombre,
      a.email,
      a.whatsapp,
      a.entrada ? ENTRADA_LABEL[a.entrada] : "",
      a.cohorte,
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
      "Content-Disposition": `attachment; filename="master-ia-360-alumnos-${fecha}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
