import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { destinoDeMiembro, getMiembro } from "@/lib/comunidad/auth";
import { FormRegistro } from "@/components/comunidad/FormRegistro";

export const metadata: Metadata = {
  title: "Crea tu cuenta · Master IA 360",
  robots: { index: false, follow: false },
};

export default async function RegistroPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // Quien ya tiene cuenta no vuelve a registrarse: va a donde le corresponde (sin bucles).
  const miembro = await getMiembro();
  if (miembro) redirect(destinoDeMiembro(miembro));
  const { error } = await searchParams;

  return (
    <div className="relative isolate mx-auto max-w-md py-6 sm:py-12">
      <div aria-hidden="true" className="mia-dots pointer-events-none absolute inset-x-0 -top-10 -z-10 h-64" />
      <p className="mia-eyebrow">Master IA 360</p>
      <h1 className="mia-title mt-4">Crea tu cuenta</h1>
      <p className="mia-lead mt-4">
        Guarda tus datos y gestiona tu acceso a Master IA 360. El programa se compra por separado.
      </p>
      {error ? (
        <p role="alert" className="mia-alert mia-alert-error mt-6">
          Ese enlace ya se usó o venció. Vuelve a llenar tus datos y te enviamos uno nuevo.
        </p>
      ) : null}
      <div className="mia-card mt-8">
        <FormRegistro />
      </div>
      <p className="mia-muted mt-5 text-center text-sm">
        <Link href="/comunidad/login" className="mia-link">
          Ya tengo cuenta: iniciar sesión
        </Link>
        {" · "}
        <Link href="/comunidad/unete" className="mia-link">
          Ver el programa
        </Link>
      </p>
    </div>
  );
}
