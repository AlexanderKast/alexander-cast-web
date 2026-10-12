import Link from "next/link";
import { requireMiembroConPrivacidad } from "@/lib/comunidad/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ENTRADA_LABEL } from "@/lib/comunidad/validators";
import { botonCls } from "@/components/comunidad/ui";

export default async function ComunidadHome() {
  const m = await requireMiembroConPrivacidad();

  let tieneFicha = false;
  if (m.inscripcion) {
    const supabase = await createSupabaseServer();
    const { data } = await supabase
      .from("mia_fichas")
      .select("id")
      .eq("inscripcion_id", m.inscripcion.id)
      .maybeSingle();
    tieneFicha = data !== null;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">
          Hola, {m.nombre.split(" ")[0]}
        </h1>
        {m.inscripcion ? (
          <p className="mt-2 text-muted-foreground">
            {m.inscripcion.cohorte.nombre} · Entrada {ENTRADA_LABEL[m.inscripcion.entrada]}
          </p>
        ) : (
          <p className="mt-2 text-muted-foreground">Aún no tienes una cohorte asignada.</p>
        )}
      </div>

      {m.inscripcion ? (
        <section className="rounded-2xl border border-line-strong bg-surface-1 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Ficha de tu negocio</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {tieneFicha
              ? "Tu ficha está guardada. Puedes editarla hasta que empiece la clase 1."
              : "Cuéntanos qué vendes, a quién y qué te gustaría tener. Es lo primero que necesitamos de ti."}
          </p>
          <Link href="/comunidad/ficha" className={botonCls + " mt-4"}>
            {tieneFicha ? "Ver o editar mi ficha" : "Llenar mi ficha"}
          </Link>
        </section>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Las clases, los recursos y la comunidad llegan en las próximas semanas, aquí mismo.
      </p>
    </div>
  );
}
