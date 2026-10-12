import { redirect } from "next/navigation";
import { getMiembro } from "@/lib/comunidad/auth";
import { FormAcceso } from "@/components/comunidad/FormAcceso";
import { FormEntradaDirecta } from "@/components/comunidad/FormEntradaDirecta";
import { entradaDirectaActiva } from "../dev-actions";

export default async function LoginComunidadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getMiembro()) redirect("/comunidad");
  const { error } = await searchParams;

  return (
    <div className="relative isolate mx-auto max-w-md py-6 sm:py-12">
      <div aria-hidden="true" className="mia-dots pointer-events-none absolute inset-x-0 -top-10 -z-10 h-64" />
      <p className="mia-eyebrow">Master IA 360 · Comunidad</p>
      <h1 className="mia-title mt-4">Entra a tu comunidad</h1>
      <p className="mia-lead mt-4">
        Aprende, avanza y comparte con otros emprendedores. Sin contraseña: escribe el correo con el
        que te inscribiste y te enviamos un enlace de acceso.
      </p>
      {error ? (
        <p role="alert" className="mia-alert mia-alert-error mt-6">
          Ese enlace ya se usó o venció. Pide uno nuevo aquí abajo.
        </p>
      ) : null}
      <div className="mia-card mt-8">
        <FormAcceso />
      </div>
      {entradaDirectaActiva() ? (
        <div className="mia-card-soft mt-4">
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
