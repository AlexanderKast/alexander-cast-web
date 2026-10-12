import Link from "next/link";
import { requireDerecho } from "@/lib/comunidad/auth";
import { PRODUCTO_PRINCIPAL } from "@/lib/comunidad/oferta";
import { createSupabaseServer } from "@/lib/supabase/server";
import { FormFicha } from "@/components/comunidad/FormFicha";

/** La ficha es contenido de Master IA 360: exige el derecho vigente sobre ESE programa (y la RLS lo repite). */
export default async function FichaPage() {
  const { derecho } = await requireDerecho(PRODUCTO_PRINCIPAL);

  // RLS: solo devuelve la ficha propia y solo con el derecho vigente.
  const supabase = await createSupabaseServer();
  const { data: ficha } = await supabase
    .from("mia_fichas")
    .select("vende, a_quien, quiere")
    .eq("inscripcion_id", derecho.id)
    .maybeSingle();

  const limite = derecho.cohorte?.clase1En ?? null;
  const bloqueada = limite !== null && new Date() >= new Date(limite);

  return (
    <div className="mx-auto max-w-xl">
      <Link href={`/comunidad/programas/${PRODUCTO_PRINCIPAL}`} className="mia-back">
        ← Volver al programa
      </Link>
      <p className="mia-eyebrow mt-6">Entregable 1</p>
      <h1 className="mia-title mt-3">Ficha de tu negocio</h1>
      <p className="mia-lead mt-3">
        Respuestas cortas y concretas: con esto diseñamos las clases para que te sirvan a ti. Puedes editarla hasta
        que empiece la clase 1.
      </p>
      <div className="mia-card mt-8">
        <FormFicha inicial={ficha} bloqueada={bloqueada} />
      </div>
    </div>
  );
}
