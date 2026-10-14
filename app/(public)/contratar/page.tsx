import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContratarForm } from "@/components/imt/pagos/ContratarForm";
import { Eyebrow } from "@/components/imt/ui/Eyebrow";
import { isPlanId } from "@/content/imt";
import { esPeriodo } from "@/lib/imt/pagos";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Contratar plan",
  description: "Contrata tu plan de IA Master Tech y paga en línea de forma segura con Stripe.",
  path: "/contratar",
  noindex: true,
});

type Params = Promise<{ plan?: string; periodo?: string; cancelado?: string }>;

export default async function ContratarPage({ searchParams }: { searchParams: Params }) {
  const { plan, periodo, cancelado } = await searchParams;
  if (!isPlanId(plan)) redirect("/planes");

  return (
    <section aria-labelledby="contratar-title" className="relative isolate mx-auto w-full max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pb-24 sm:pt-36 lg:px-8">
      <div aria-hidden="true" className="imt-dots pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] opacity-60" />
      <Eyebrow>IA Master Tech · Contratar</Eyebrow>
      <h1 id="contratar-title" className="mt-4 text-balance text-[2.25rem] font-bold leading-tight sm:text-5xl">
        Confirma tu plan y paga
      </h1>
      <p className="mb-10 mt-4 max-w-2xl text-pretty text-base leading-relaxed text-imt-muted sm:text-lg">
        Un solo paso: tus datos y el pago. Después te escribimos para agendar el diagnóstico y arrancar el primer sprint.
      </p>
      <ContratarForm plan={plan} periodo={esPeriodo(periodo) ? periodo : "mensual"} cancelado={cancelado === "1"} />
    </section>
  );
}
