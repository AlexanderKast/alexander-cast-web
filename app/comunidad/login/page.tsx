import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { destinoDeMiembro, getMiembro } from "@/lib/comunidad/auth";
import { rutaInternaPermitida } from "@/lib/comunidad/acceso";
import { FormAcceso } from "@/components/comunidad/FormAcceso";
import { FormEntradaDirecta } from "@/components/comunidad/FormEntradaDirecta";
import { entradaDirectaActiva } from "@/lib/comunidad/dev";

export const metadata: Metadata = {
  title: "Inicia sesión · Master IA 360",
  robots: { index: false, follow: false },
};

export default async function LoginComunidadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  // Quien ya tiene sesión va a su destino resuelto (cuenta sin inscripción → mi cuenta, etc.).
  const miembro = await getMiembro();
  if (miembro) redirect(destinoDeMiembro(miembro));
  const { error, next } = await searchParams;

  return (
    <div className="relative isolate mx-auto max-w-md py-6 sm:py-12">
      <div aria-hidden="true" className="mia-dots pointer-events-none absolute inset-x-0 -top-10 -z-10 h-64" />
      <p className="mia-eyebrow">Master IA 360</p>
      <h1 className="mia-title mt-4">Inicia sesión</h1>
      <p className="mia-lead mt-4">
        Escribe tu correo y te enviaremos un enlace para entrar. No necesitas contraseña.
      </p>
      {error ? (
        <p role="alert" className="mia-alert mia-alert-error mt-6">
          Ese enlace ya se usó o venció. Pide uno nuevo aquí abajo.
        </p>
      ) : null}
      <div className="mia-card mt-8">
        <FormAcceso next={rutaInternaPermitida(next)} />
      </div>
      <p className="mia-muted mt-5 text-center text-sm">
        <Link href="/comunidad/registro" className="mia-link">
          Crear cuenta
        </Link>
        {" · "}
        <Link href="/comunidad/unete" className="mia-link">
          Conocer el programa
        </Link>
      </p>
      {entradaDirectaActiva() ? (
        <div className="mia-card-soft mt-6">
          <p className="mia-eyebrow">Solo en tu equipo · desarrollo</p>
          <p className="mia-muted mb-4 mt-2 text-sm">
            Entrada directa con el correo, sin enlace. No existe en producción.
          </p>
          <FormEntradaDirecta />
        </div>
      ) : null}
    </div>
  );
}
