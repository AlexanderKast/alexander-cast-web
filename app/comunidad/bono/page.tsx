import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMiembroConPrivacidad } from "@/lib/comunidad/auth";
import { SESION_ARRANQUE } from "@/lib/comunidad/oferta";
import { botonCls } from "@/components/comunidad/ui";

function fechaLegible(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "full",
    timeStyle: "short",
  });
}

/** Sesión grupal de arranque: la reciben quienes entraron con Preventa o VIP. */
export default async function SesionArranquePage() {
  const m = await requireMiembroConPrivacidad();
  if (!m.inscripcion?.bonusClasePrivada) redirect("/comunidad");

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/comunidad" className="mia-back">
        ← Volver
      </Link>
      <section className="mia-card-dark mt-6">
        <p className="mia-eyebrow">Incluida en tu entrada · antes de la clase 1</p>
        <h1 className="mia-title mt-4">{SESION_ARRANQUE.titulo}</h1>
        <p className="mia-lead mt-4">{SESION_ARRANQUE.resumen}</p>
      </section>

      <section className="mia-card mt-6">
        <p className="mia-eyebrow">Acceso</p>
        {SESION_ARRANQUE.fecha ? (
          <p className="mt-3 text-lg font-semibold">{fechaLegible(SESION_ARRANQUE.fecha)}</p>
        ) : (
          <p className="mt-3 text-lg font-semibold">Te avisaremos la fecha por correo y WhatsApp.</p>
        )}
        {SESION_ARRANQUE.enlace ? (
          <a href={SESION_ARRANQUE.enlace} target="_blank" rel="noopener noreferrer" className={botonCls + " mt-5"}>
            Entrar a la sesión
          </a>
        ) : (
          <p className="mia-muted mt-2 text-sm">El enlace aparecerá aquí cuando esté listo.</p>
        )}
      </section>
    </div>
  );
}
