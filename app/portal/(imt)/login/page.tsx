import type { Metadata } from "next";
import Link from "next/link";
import { FormAccesoPortal } from "@/components/imt/pagos/FormAccesoPortal";
import { PortalLoginForm } from "./PortalLoginForm";

export const metadata: Metadata = {
  title: "Acceso al portal · IA Master Tech",
  robots: { index: false, follow: false },
};

export default async function PortalLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div className="relative isolate mx-auto max-w-md py-6 sm:py-12">
      <div aria-hidden="true" className="mia-dots pointer-events-none absolute inset-x-0 -top-10 -z-10 h-64" />
      <p className="mia-eyebrow">Portal de clientes</p>
      <h1 className="mia-title mt-4">Entra a tu portal</h1>
      <p className="mia-lead mt-4">
        Escribe tu correo y te enviaremos un enlace para entrar. No necesitas contraseña.
      </p>
      {error ? (
        <p role="alert" className="mia-alert mia-alert-error mt-6">
          Ese enlace ya se usó o venció. Pide uno nuevo aquí abajo.
        </p>
      ) : null}
      <div className="mia-card mt-8">
        <FormAccesoPortal />
      </div>

      {/* Clientes antiguos de agencia que entran con contraseña. */}
      <details className="mia-card-soft mt-6">
        <summary className="mia-link cursor-pointer text-sm">Entrar con contraseña</summary>
        <div className="mt-4">
          <PortalLoginForm />
        </div>
      </details>

      <p className="mia-muted mt-5 text-center text-sm">
        ¿Aún no eres cliente?{" "}
        <Link href="/planes" className="mia-link">
          Conoce los planes
        </Link>
      </p>
    </div>
  );
}
