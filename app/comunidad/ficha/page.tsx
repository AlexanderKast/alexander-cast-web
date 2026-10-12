import Link from "next/link";
import { requireMiembroConPrivacidad } from "@/lib/comunidad/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { FormFicha } from "@/components/comunidad/FormFicha";

export default async function FichaPage() {
  const m = await requireMiembroConPrivacidad();

  if (!m.inscripcion) {
    return <p className="text-muted-foreground">Aún no tienes una inscripción activa.</p>;
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
      <Link href="/comunidad" className="text-sm text-muted-foreground hover:text-foreground">
        ← Volver
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold">Ficha de tu negocio</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Respuestas cortas y concretas. Puedes editarla hasta que empiece la clase 1.
      </p>
      <div className="mt-6">
        <FormFicha inicial={ficha} bloqueada={bloqueada} />
      </div>
    </div>
  );
}
