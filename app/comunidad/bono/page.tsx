import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMiembroConPrivacidad } from "@/lib/comunidad/auth";
import { CLASE_PRIVADA } from "@/lib/comunidad/oferta";
import { botonCls } from "@/components/comunidad/ui";

function fechaLegible(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "full",
    timeStyle: "short",
  });
}

/** Clase privada: solo para quien se inscribió dentro de la ventana del bono. */
export default async function BonoPage() {
  const m = await requireMiembroConPrivacidad();
  if (!m.inscripcion?.bonusClasePrivada) redirect("/comunidad");

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/comunidad" className="mia-back">
        ← Volver
      </Link>
      <section className="mia-card-dark mt-6">
        <p className="mia-eyebrow">Bono exclusivo · inscritos antes del cierre</p>
        <h1 className="mia-title mt-4">{CLASE_PRIVADA.titulo}</h1>
        <p className="mia-lead mt-4">{CLASE_PRIVADA.resumen}</p>
        <ul className="mt-6 space-y-2 text-sm">
          {CLASE_PRIVADA.incluye.map((x) => (
            <li key={x} className="flex gap-2">
              <span aria-hidden="true" className="text-[var(--mia-accent)]">✓</span>
              {x}
            </li>
          ))}
        </ul>
      </section>

      <section className="mia-card mt-6">
        <p className="mia-eyebrow">Acceso</p>
        {CLASE_PRIVADA.fecha ? (
          <p className="mt-3 text-lg font-semibold">{fechaLegible(CLASE_PRIVADA.fecha)}</p>
        ) : (
          <p className="mt-3 text-lg font-semibold">Te avisaremos la fecha por correo y WhatsApp.</p>
        )}
        {CLASE_PRIVADA.enlace ? (
          <a href={CLASE_PRIVADA.enlace} target="_blank" rel="noopener noreferrer" className={botonCls + " mt-5"}>
            Entrar a la clase privada
          </a>
        ) : (
          <p className="mia-muted mt-2 text-sm">El enlace aparecerá aquí cuando esté listo.</p>
        )}
      </section>
    </div>
  );
}
