import { redirect } from "next/navigation";
import { getMiembro } from "@/lib/comunidad/auth";
import { FormAcceso } from "@/components/comunidad/FormAcceso";

export default async function LoginComunidadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getMiembro()) redirect("/comunidad");
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="font-display text-3xl font-semibold">Entra a tu comunidad</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sin contraseña. Escribe el correo con el que te inscribiste y te enviamos un enlace de acceso.
      </p>
      {error ? (
        <p role="alert" className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Ese enlace ya se usó o venció. Pide uno nuevo aquí abajo.
        </p>
      ) : null}
      <div className="mt-6">
        <FormAcceso />
      </div>
    </div>
  );
}
