import type { Metadata } from "next";
import Link from "next/link";
import { FormCompra, type OpcionNivel } from "@/components/comunidad/FormCompra";
import { FormInformacion } from "@/components/comunidad/FormInformacion";
import { Countdown } from "@/components/comunidad/Countdown";
import { EnlaceCompra, VistaLanding } from "@/components/comunidad/EventosLanding";
import { botonCls, botonSecundarioCls } from "@/components/comunidad/ui";
import {
  AVISO_CLAUDE,
  FIN_PREVENTA,
  INCLUYE_TODOS,
  LO_QUE_TE_LLEVAS,
  NIVELES,
  SESION_ARRANQUE,
  fechaLimiteLegible,
  montoCentavos,
  nivelesDisponibles,
  preventaVigente,
  type Nivel,
} from "@/lib/comunidad/oferta";
import { cuposRestantes, obtenerPedido } from "@/lib/comunidad/pedidos";
import { pedidoDelNavegador } from "@/lib/comunidad/sesion-pedido";
import { sanearUtm, UTM_CAMPOS } from "@/lib/comunidad/consentimiento";
import { NOMBRE_PRODUCTO, formatoPesos } from "@/lib/comunidad/precio";

/** Página de venta: sí se puede indexar y compartir. */
export const metadata: Metadata = {
  title: `${NOMBRE_PRODUCTO} · Inscripciones abiertas`,
  description:
    "Aprende a usar IA en tu negocio, en vivo y acompañado: 4 semanas, 8 clases, entregables y 60 días de comunidad activa.",
  robots: { index: true, follow: true },
};

export const dynamic = "force-dynamic";

const PREGUNTAS = [
  ["¿Cuándo empiezan las clases?", "El jueves 22 de octubre. Son 8 clases de 2,5 horas, 2 por semana, 100% virtuales."],
  ["¿Cómo entro a la plataforma?", "Cuando se confirma tu pago recibes un correo con un botón de acceso. Sin contraseñas."],
  [
    "¿Qué pasa si no termino hoy el pago?",
    "Puedes retomar la compra mientras haya cupos y la oferta siga vigente. Dejar tus datos no reserva un cupo.",
  ],
  ["¿Qué necesito aparte?", AVISO_CLAUDE],
  ["¿Puedo pedir información antes de comprar?", "Sí: deja tus datos en «Quiero información» y te contactamos. No crea una cuenta ni un cobro."],
] as const;

const RESULTADOS = [
  ["Una web", "Construyes y publicas tu landing con las plantillas y la guía del programa."],
  ["Una app", "Diseñas el prototipo de tu app y aprendes a conectarle datos."],
  ["Una herramienta", "Armas una herramienta interna simple y tu primera tarea automatizada."],
] as const;

type Busqueda = { cancelado?: string; o?: string; n?: string; p?: string } & Record<string, string | undefined>;

export default async function UnetePage({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const sp = await searchParams;
  const origen = sp.o === "stand" ? "stand" : "web";

  // Disponibilidad SIEMPRE del servidor. Si el servicio de cupos falla se dice, no se aparenta.
  const disponibles = nivelesDisponibles();
  const cupos = await cuposRestantes().catch(() => null);
  const agotado = cupos !== null && cupos.total <= 0;

  const opciones: OpcionNivel[] = disponibles
    .filter((id) => !(id === "vip" && cupos !== null && cupos.vip <= 0))
    .map((id) => ({
      id,
      nombre: NIVELES[id].nombre,
      precio: formatoPesos(montoCentavos(id)),
      nota: NIVELES[id].nota,
      extras: NIVELES[id].extras,
    }));
  const abierto = opciones.length > 0 && !agotado;
  const inicial: Nivel | undefined = opciones.find((x) => x.id === sp.n)?.id ?? opciones[0]?.id;

  // Retomar compra: SOLO con la cookie firmada de este navegador. Un `?p=<id>` viejo no da acceso a nada.
  const idRetomar = await pedidoDelNavegador();
  const retomado = idRetomar ? await obtenerPedido(idRetomar).catch(() => null) : null;
  const nombreRetomado =
    retomado && ["pendiente", "abandonado", "fallido"].includes(retomado.estado) ? retomado.nombre : null;
  const enlaceViejo = Boolean(sp.p) && !nombreRetomado;

  const utm: Record<string, string> = {};
  for (const c of UTM_CAMPOS) {
    const v = sanearUtm(sp[c]);
    if (v) utm[c] = v;
  }

  return (
    <div className="space-y-14 sm:space-y-20">
      <VistaLanding />

      {/* Hero */}
      <header className="relative isolate">
        <div aria-hidden="true" className="mia-dots pointer-events-none absolute inset-x-0 -top-10 -z-10 h-72" />
        <p className="mia-eyebrow">Cohorte 1 · empieza el 22 de octubre</p>
        <h1 className="mia-title mt-4 max-w-3xl">Aprende a usar IA en tu negocio, en vivo y acompañado</h1>
        <p className="mia-lead mt-5">
          {NOMBRE_PRODUCTO} es un programa de 4 semanas, con 8 clases en vivo y entregables, para pasar de «probar
          herramientas» a tener sistemas funcionando en tu negocio.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <EnlaceCompra href="#entradas" className={botonCls}>
            Ver entradas
          </EnlaceCompra>
          <a href="#informacion" className={botonSecundarioCls + " !min-h-12 px-6 text-base"}>
            Quiero información
          </a>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="mia-chip">100% virtual</span>
          <span className="mia-chip">8 clases en vivo</span>
          <span className="mia-chip">Cupos limitados</span>
        </div>
      </header>

      {/* Resultados */}
      <section aria-labelledby="resultados">
        <p id="resultados" className="mia-eyebrow">
          Qué construyes
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {RESULTADOS.map(([t, d]) => (
            <article key={t} className="mia-card-soft !p-5">
              <h2 className="text-lg font-semibold">{t}</h2>
              <p className="mia-muted mt-1 text-sm leading-relaxed">{d}</p>
            </article>
          ))}
        </div>
        <p className="mia-eyebrow mt-8">Lo que te llevas</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {LO_QUE_TE_LLEVAS.map((x) => (
            <li key={x} className="mia-card flex gap-3 !p-4 text-sm leading-relaxed">
              <span aria-hidden="true" className="text-[var(--mia-accent-ink)]">✓</span>
              {x}
            </li>
          ))}
        </ul>
      </section>

      {/* Beneficios y modalidad */}
      <section aria-labelledby="modalidad">
        <p id="modalidad" className="mia-eyebrow">
          Modalidad y beneficios
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {INCLUYE_TODOS.map((x) => (
            <li key={x} className="mia-card-soft flex gap-3 !p-4 text-sm leading-relaxed">
              <span aria-hidden="true" className="text-[var(--mia-accent-ink)]">✓</span>
              {x}
            </li>
          ))}
        </ul>
        <p role="note" className="mia-alert mt-4">
          <strong>Importante:</strong> {AVISO_CLAUDE}
        </p>
      </section>

      {/* Entradas: se ven ANTES de pedir datos */}
      <section id="entradas" aria-labelledby="entradas-titulo" className="scroll-mt-24">
        <p id="entradas-titulo" className="mia-eyebrow">
          Entradas
        </p>
        {preventaVigente() && abierto ? (
          <div className="mia-card-dark mt-4">
            <p className="mia-eyebrow">Precio de feria · hasta el domingo {fechaLimiteLegible()}</p>
            <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
              {formatoPesos(montoCentavos("preventa"))} y entras con la {SESION_ARRANQUE.titulo.toLowerCase()}
            </h2>
            <p className="mia-lead mt-3">{SESION_ARRANQUE.resumen}</p>
            <p className="mia-label mt-7 !text-[var(--mia-dark-muted)]">El precio de feria cierra en</p>
            <Countdown hasta={FIN_PREVENTA.toISOString()} />
            <p className="mt-4 text-xs text-[var(--mia-dark-muted)]">
              Después del {fechaLimiteLegible()} el programa cuesta {formatoPesos(montoCentavos("regular"))} y la sesión
              grupal de arranque queda solo para el VIP. La sesión 1:1 es exclusiva del VIP.
            </p>
          </div>
        ) : null}

        {abierto ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {opciones.map((o) => (
              <article key={o.id} className="mia-card flex flex-col">
                <h2 className="text-lg font-semibold">{o.nombre}</h2>
                <p className="mt-2 font-[family-name:var(--mia-font-display)] text-3xl font-bold tracking-tight">
                  {o.precio} <span className="mia-muted text-sm font-normal">COP</span>
                </p>
                <p className="mia-muted mt-1 text-sm">{o.nota}</p>
                <p className="mia-label mt-5">Además de todo lo anterior</p>
                <ul className="flex-1 space-y-1.5 text-sm">
                  {o.extras.length ? (
                    o.extras.map((x) => (
                      <li key={x} className="flex gap-2">
                        <span aria-hidden="true" className="text-[var(--mia-accent-ink)]">✓</span>
                        {x}
                      </li>
                    ))
                  ) : (
                    <li className="mia-muted">Sin extras: el programa completo.</li>
                  )}
                </ul>
                <EnlaceCompra href={`?n=${o.id}#compra`} nivel={o.id} className={botonCls + " mt-5"}>
                  Elegir {o.nombre.split(" ·")[0]}
                </EnlaceCompra>
              </article>
            ))}
          </div>
        ) : (
          <p className="mia-alert mt-4">
            {agotado
              ? "Los cupos de esta cohorte se agotaron."
              : "Las inscripciones de esta cohorte cerraron."}{" "}
            Puedes dejar tus datos en la lista de espera aquí abajo; no es una reserva.
          </p>
        )}
        {cupos === null ? (
          <p role="status" className="mia-muted mt-3 text-sm">
            No pudimos consultar los cupos en este momento. La disponibilidad se confirma al continuar con la compra.
          </p>
        ) : null}
      </section>

      {/* Compra */}
      {abierto && inicial ? (
        <section id="compra" aria-labelledby="compra-titulo" className="scroll-mt-24">
          <p id="compra-titulo" className="mia-eyebrow">
            Comprar
          </p>
          {sp.cancelado ? (
            <p role="status" className="mia-alert mt-4">
              No se completó el pago. Puedes retomar la compra mientras haya cupos y la oferta siga vigente.
            </p>
          ) : null}
          {enlaceViejo ? (
            <p role="status" className="mia-alert mt-4">
              Para proteger tus datos, retomamos una compra solo desde el mismo navegador donde la empezaste. Vuelve a
              llenar tus datos y listo.
            </p>
          ) : null}
          <div className="mia-card mx-auto mt-4 max-w-xl">
            <FormCompra niveles={opciones} nivelInicial={inicial} origen={origen} nombreRetomado={nombreRetomado} />
          </div>
          <p className="mia-muted mt-4 text-center text-sm">
            ¿Ya tienes cuenta?{" "}
            <Link href="/comunidad/login" className="mia-link">
              Inicia sesión
            </Link>
            {" · "}
            <Link href="/comunidad/registro" className="mia-link">
              Crear cuenta
            </Link>
          </p>
        </section>
      ) : null}

      {/* Información / lista de espera: independiente de la compra */}
      <section id="informacion" aria-labelledby="informacion-titulo" className="scroll-mt-24">
        <p className="mia-eyebrow">{abierto ? "Información" : "Lista de espera"}</p>
        <div className="mia-card mx-auto mt-4 max-w-xl">
          <h2 id="informacion-titulo" className="text-xl font-bold">
            {abierto ? "¿Quieres resolver tus dudas antes de comprar?" : "Déjanos tus datos para la próxima cohorte"}
          </h2>
          <p className="mia-muted mb-5 mt-2 text-sm leading-relaxed">
            {abierto
              ? "Cuéntanos quién eres y te contactamos. Pedir información no crea una cuenta, un cobro ni reserva un cupo."
              : "Queda en la lista de espera. No es una reserva ni un cobro."}
          </p>
          <FormInformacion origen={origen} utm={utm} listaDeEspera={!abierto} />
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq">
        <p id="faq" className="mia-eyebrow">
          Preguntas frecuentes
        </p>
        <div className="mt-4 divide-y divide-[var(--mia-border)] rounded-2xl border border-[var(--mia-border)] bg-[var(--mia-elev)]">
          {PREGUNTAS.map(([q, a]) => (
            <details key={q} className="group p-5">
              <summary className="cursor-pointer list-none text-sm font-semibold">{q}</summary>
              <p className="mia-muted mt-2 text-sm leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="mia-muted flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--mia-border)] pt-6 text-sm">
        <Link href="/legal/privacidad" className="mia-link">
          Política de privacidad
        </Link>
        <Link href="/legal/terminos" className="mia-link">
          Términos
        </Link>
        <span>Master IA 360 · IA Master Tech</span>
      </footer>
    </div>
  );
}
