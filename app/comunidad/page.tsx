import Link from "next/link";
import { requireMiembroConPrivacidad } from "@/lib/comunidad/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ENTRADA_LABEL } from "@/lib/comunidad/validators";
import { botonCls } from "@/components/comunidad/ui";
import { SESION_ARRANQUE } from "@/lib/comunidad/oferta";

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

  const primerNombre = m.nombre.split(" ")[0];

  return (
    <div className="space-y-10">
      <section className="mia-card-dark relative overflow-hidden">
        <p className="mia-eyebrow">
          {m.inscripcion
            ? `${m.inscripcion.cohorte.nombre} · Entrada ${ENTRADA_LABEL[m.inscripcion.entrada]}`
            : "Master IA 360"}
        </p>
        <h1 className="mia-title mt-4">Hola, {primerNombre}</h1>
        <p className="mia-lead mt-4">
          Este es tu espacio para aprender IA aplicada a tu negocio, avanzar con tus entregables y
          crecer junto a otros emprendedores.
        </p>
      </section>

      {m.inscripcion?.bonusClasePrivada ? (
        <section className="mia-card-dark flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mia-eyebrow">Bono exclusivo</p>
            <h2 className="mt-2 text-xl font-bold">{SESION_ARRANQUE.titulo}</h2>
            <p className="mia-muted mt-1 text-sm">Incluida en tu entrada, antes de la clase 1.</p>
          </div>
          <Link href="/comunidad/bono" className={botonCls + " shrink-0"}>
            Ver la sesión de arranque
          </Link>
        </section>
      ) : null}

      {m.inscripcion ? (
        <section>
          <p className="mia-eyebrow">Tu ruta</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <article className="mia-card flex flex-col">
              <span className="mia-chip w-fit">{tieneFicha ? "Hecho" : "Paso 1"}</span>
              <h2 className="mt-4 text-lg font-semibold">Ficha de tu negocio</h2>
              <p className="mia-muted mt-2 flex-1 text-sm leading-relaxed">
                {tieneFicha
                  ? "Está guardada. Puedes ajustarla hasta que empiece la clase 1."
                  : "Cuéntanos qué vendes, a quién y qué te gustaría tener."}
              </p>
              <Link href="/comunidad/ficha" className={botonCls + " mia-btn-sm mt-5"}>
                {tieneFicha ? "Ver o editar" : "Llenar mi ficha"}
              </Link>
            </article>

            <article className="mia-card-soft flex flex-col">
              <span className="mia-chip w-fit">Pronto</span>
              <h2 className="mt-4 text-lg font-semibold">Clases</h2>
              <p className="mia-muted mt-2 text-sm leading-relaxed">
                8 clases en vivo, con grabación, materiales descargables y tareas.
              </p>
            </article>

            <article className="mia-card-soft flex flex-col">
              <span className="mia-chip w-fit">Pronto</span>
              <h2 className="mt-4 text-lg font-semibold">Comunidad</h2>
              <p className="mia-muted mt-2 text-sm leading-relaxed">
                Preguntas, avances y recursos para compartir con tu cohorte.
              </p>
            </article>
          </div>
        </section>
      ) : (
        <p className="mia-muted">Aún no tienes una cohorte asignada.</p>
      )}
    </div>
  );
}
