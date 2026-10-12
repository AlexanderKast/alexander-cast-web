import Link from "next/link";
import { requireMiembroConPrivacidad } from "@/lib/comunidad/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { FormFicha } from "@/components/comunidad/FormFicha";

export default async function FichaPage() {
  const m = await requireMiembroConPrivacidad();

  if (!m.inscripcion) {
    return <p className="mia-muted">Aún no tienes una inscripción activa.</p>;
  }

  // RLS: solo devuelve la ficha propia.
  const supabase = await createSupabaseServer();
  const { data: ficha } = await supabase
    .from("mia_fichas")
    .select("vende, a_quien, quiere")
    .eq("inscripcion_id", m.inscripcion.id)
    .maybeSingle();

  const limite = m.inscripcion.cohorte.clase1En;
  const bloqueada = limite !== null && new Date() >= new Date(limite);

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/comunidad" className="mia-back">
        ← Volver
      </Link>
      <p className="mia-eyebrow mt-6">Entregable 1</p>
      <h1 className="mia-title mt-3">Ficha de tu negocio</h1>
      <p className="mia-lead mt-3">
        Respuestas cortas y concretas: con esto diseñamos las clases para que te sirvan a ti. Puedes
        editarla hasta que empiece la clase 1.
      </p>
      <div className="mia-card mt-8">
        <FormFicha inicial={ficha} bloqueada={bloqueada} />
      </div>
    </div>
  );
}
