import { redirect } from "next/navigation";
import { EstadoPago } from "@/components/comunidad/EstadoPago";
import { pedidoIdValido } from "@/lib/comunidad/pagos";

export default async function GraciasPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const id = pedidoIdValido((await searchParams).p);
  if (!id) redirect("/comunidad/unete");

  return (
    <div className="mx-auto max-w-lg py-8 sm:py-16">
      <p className="mia-eyebrow mb-4">Master IA 360</p>
      <EstadoPago pedidoId={id} />
    </div>
  );
}
