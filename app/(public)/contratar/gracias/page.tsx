import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { buttonClasses } from "@/components/imt/ui/Button";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Pago recibido",
  description: "Gracias por contratar IA Master Tech.",
  path: "/contratar/gracias",
  noindex: true,
});

const PASOS = [
  "Te enviamos la confirmación del pago a tu correo.",
  "Te escribimos por WhatsApp en menos de 24 horas hábiles.",
  "Agendamos el diagnóstico y arranca tu primer sprint semanal.",
];

/**
 * No confirma el pago por sí misma: la confirmación real llega por el webhook.
 * Esta página solo tranquiliza al cliente y le dice qué sigue.
 */
export default function GraciasContratoPage() {
  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-4 py-32 text-center sm:px-6">
      <span className="flex size-14 items-center justify-center rounded-full bg-imt-accent text-imt-bg">
        <Check className="size-7" strokeWidth={3} aria-hidden />
      </span>
      <h1 className="mt-6 text-balance text-4xl font-bold sm:text-5xl">Listo, gracias.</h1>
      <p className="mt-4 text-pretty text-lg text-imt-muted">
        Estamos confirmando tu pago con Stripe. Esto es lo que sigue:
      </p>
      <ol className="mt-8 space-y-3 text-left text-imt-text">
        {PASOS.map((p, i) => (
          <li key={p} className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-imt-accent font-imt-mono text-sm text-imt-accent">
              {i + 1}
            </span>
            {p}
          </li>
        ))}
      </ol>
      <Link href="/" className={buttonClasses("secondary", "md", "mt-10")}>
        Volver al inicio
      </Link>
    </section>
  );
}
