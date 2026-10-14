import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BotonFacturacion } from "@/components/imt/pagos/BotonFacturacion";
import { formatCop, planName } from "@/content/imt";
import { cargarPanelCliente, type PlanCliente } from "@/lib/imt/portal";
import { createSupabaseServer, createSupabaseServiceRole } from "@/lib/supabase/server";
import { whatsappUrl } from "@/site.config";

export const metadata: Metadata = {
  title: "Mi plan · IA Master Tech",
  robots: { index: false, follow: false },
};

const fecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: "America/Bogota" });
const fechaCorta = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "America/Bogota" });

function estadoDelPlan(p: PlanCliente): { texto: string; ok: boolean } {
  if (p.estado === "reembolsado") return { texto: "Reembolsado", ok: false };
  if (p.periodo === "anual") return { texto: "Plan anual activo", ok: true };
  if (p.suscripcionEstado === "en_mora") return { texto: "Pago pendiente", ok: false };
  if (p.suscripcionEstado === "cancelada") return { texto: "Cancelado", ok: false };
  return { texto: "Suscripción activa", ok: true };
}

export default async function MiPlanPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const db = createSupabaseServiceRole();
  const { data: vinculos } = await db
    .from("portal_client_users")
    .select("nombre, client_id, portal_clients(id, nombre, tipo)")
    .eq("auth_user_id", user.id)
    .eq("activo", true);

  type Vinculo = {
    nombre: string | null;
    client_id: string;
    portal_clients: { id: string; nombre: string; tipo: string } | { id: string; nombre: string; tipo: string }[] | null;
  };
  const vinculo = ((vinculos ?? []) as unknown as Vinculo[])
    .map((v) => ({ nombre: v.nombre, pc: Array.isArray(v.portal_clients) ? v.portal_clients[0] : v.portal_clients }))
    .find((v) => v.pc?.tipo === "imt");

  if (!vinculo?.pc) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <p className="mia-eyebrow">Portal de clientes</p>
        <h1 className="mia-title mt-4">Aún no tienes un plan</h1>
        <p className="mia-lead mt-3">Tu cuenta no está vinculada a ningún plan de IA Master Tech.</p>
        <Link href="/planes" className="mia-link mt-6 inline-block">
          Ver los planes
        </Link>
      </div>
    );
  }

  const { planes, cobros } = await cargarPanelCliente(db, vinculo.pc.id);
  const actual = planes.find((p) => p.estado === "pagado") ?? planes[0];
  const nombre = (vinculo.nombre ?? "").split(" ")[0];
  const hayPagoGestionable = planes.some((p) => p.estado === "pagado" && p.tienePago);

  return (
    <div className="space-y-10">
      <header>
        <p className="mia-eyebrow">{vinculo.pc.nombre}</p>
        <h1 className="mia-title mt-3">{nombre ? `Hola, ${nombre}.` : "Tu portal"}</h1>
        <p className="mia-lead mt-3">Aquí ves tu plan, tus cobros y gestionas tu tarjeta.</p>
      </header>

      {!actual ? (
        <section className="mia-card">
          <h2 className="font-semibold">Estamos confirmando tu pago</h2>
          <p className="mia-muted mt-2 text-sm">
            En cuanto Stripe lo confirme, tu plan aparece aquí. Si ya pasaron unos minutos, escríbenos.
          </p>
        </section>
      ) : (
        <section aria-labelledby="plan-titulo" className="space-y-4">
          <h2 id="plan-titulo" className="mia-stat-label">
            Tu plan
          </h2>
          {planes.map((p) => {
            const estado = estadoDelPlan(p);
            return (
              <article key={p.id} className="mia-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm tracking-[0.22em]">{planName(p.plan)}</p>
                    <p className="mia-stat-value">
                      {formatCop(p.importeCop)}{" "}
                      <span className="mia-muted text-base font-normal">
                        COP {p.periodo === "anual" ? "· pago anual" : "/ mes"}
                      </span>
                    </p>
                  </div>
                  <span className={"mia-chip " + (estado.ok ? "mia-chip-ok" : "")}>{estado.texto}</span>
                </div>
                <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div>
                    <dt className="mia-stat-label">Inicio</dt>
                    <dd className="mt-1 text-sm">{p.pagadoAt ? fecha.format(new Date(p.pagadoAt)) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="mia-stat-label">Contrato mínimo</dt>
                    <dd className="mt-1 text-sm">
                      {p.minimoHasta
                        ? p.minimoVigente
                          ? `Hasta el ${fecha.format(new Date(p.minimoHasta))}`
                          : "Cumplido"
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="mia-stat-label">Modalidad</dt>
                    <dd className="mt-1 text-sm">
                      {p.periodo === "anual" ? "Anual: 10 meses pagados, 12 de servicio" : "Mensual, renovación automática"}
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </section>
      )}

      {hayPagoGestionable ? (
        <section className="mia-card-soft">
          <h2 className="font-semibold">Tarjeta y facturas</h2>
          <p className="mia-muted mb-4 mt-1 text-sm">
            Actualiza tu tarjeta y descarga tus facturas en el portal seguro de Stripe. Nosotros nunca vemos los datos de tu tarjeta.
          </p>
          <BotonFacturacion />
        </section>
      ) : null}

      {cobros.length > 0 ? (
        <section aria-labelledby="cobros-titulo" className="space-y-3">
          <h2 id="cobros-titulo" className="mia-stat-label">
            Cobros
          </h2>
          <div className="mia-table-wrap">
            <table className="mia-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Importe</th>
                </tr>
              </thead>
              <tbody>
                {cobros.map((c, i) => (
                  <tr key={`${c.pedidoId}-${c.pagadoAt}-${i}`}>
                    <td>{fechaCorta.format(new Date(c.pagadoAt))}</td>
                    <td className="tabular-nums">{formatCop(c.montoCop)} COP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="mia-card-soft">
        <h2 className="font-semibold">Informes del servicio</h2>
        <p className="mia-muted mt-1 text-sm">
          Tu informe mensual de horas y resultados aparecerá aquí cuando cerremos tu primer mes.
        </p>
      </section>

      <p className="mia-muted text-center text-sm">
        ¿Necesitas ayuda?{" "}
        <a href={whatsappUrl("Hola, soy cliente de IA Master Tech y necesito ayuda con mi plan.")} className="mia-link">
          Escríbenos por WhatsApp
        </a>
      </p>
    </div>
  );
}
