import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { destinoDeMiembro, requireMiembro } from "@/lib/comunidad/auth";
import { botonCls } from "@/components/comunidad/ui";

export const metadata: Metadata = {
  title: "Mi cuenta · Master IA 360",
  robots: { index: false, follow: false },
};

/**
 * Estado de una cuenta SIN inscripción vigente. Tener cuenta no da acceso al
 * programa: esto solo muestra los datos y lleva a la landing. Quien sí tiene
 * una inscripción vigente nunca se queda aquí (se evita el bucle).
 */
export default async function MiCuentaPage() {
  const m = await requireMiembro();
  if (m.inscripcion) redirect(destinoDeMiembro(m));

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="mia-eyebrow">Mi cuenta</p>
        <h1 className="mia-title mt-3">Hola, {m.nombre.split(" ")[0]}</h1>
      </div>

      <section className="mia-card">
        <h2 className="text-lg font-semibold">
          {m.inscripcionNoVigente ? "Tu inscripción ya no está vigente" : "Aún no tienes una inscripción al programa"}
        </h2>
        <p className="mia-muted mt-2 text-sm leading-relaxed">
          {m.inscripcionNoVigente
            ? "Si crees que es un error, escríbenos y lo revisamos."
            : "Tu cuenta guarda tus datos. Para entrar a las clases, los entregables y la comunidad necesitas inscribirte."}
        </p>
        <Link href="/comunidad/unete" className={botonCls + " mt-5"}>
          Ver el programa
        </Link>
      </section>

      <section className="mia-card-soft text-sm">
        <p className="mia-label">Tus datos</p>
        <p className="font-medium">{m.nombre}</p>
        <p className="mia-muted">{m.email}</p>
        {m.whatsapp ? <p className="mia-muted">{m.whatsapp}</p> : null}
      </section>
    </div>
  );
}
