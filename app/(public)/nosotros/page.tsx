import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { TEAM } from "@/content/imt";
import { Button } from "@/components/imt/ui/Button";
import { Card } from "@/components/imt/ui/Card";
import { Eyebrow } from "@/components/imt/ui/Eyebrow";
import { Section, SectionHeader } from "@/components/imt/ui/Section";
import { TeamAvatar } from "@/components/imt/landing/TeamAvatar";
import { JsonLd } from "@/components/shared/json-ld";
import { buildMetadata, buildOrganizationSchema, buildPeopleSchema } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Nosotros",
  description:
    "Alexander Castaño y Samuel Castaño: estrategia y código en la misma mesa. Por qué nace IA Master Tech y cómo trabajamos.",
  path: "/nosotros",
});

const BIOS: Record<string, string[]> = {
  alexander: [
    "8 años construyendo negocios digitales en LATAM y 6 en publicidad digital.",
    "Implementó IA en Grupo Effi y Feria Effix.",
    "Se sienta con el dueño del negocio, entiende dónde se pierde el tiempo y traduce ese problema en el sistema correcto.",
  ],
  samuel: [
    "Desarrollo de software y automatizaciones.",
    "Construye, integra y mantiene cada sistema en producción: desde la primera automatización hasta el software a la medida.",
  ],
};

const VALUES = [
  {
    title: "Entregas visibles cada semana",
    text: "Cada sprint termina con algo funcionando en producción que puedes ver y usar.",
  },
  {
    title: "Propiedad total del cliente",
    text: "Código, automatizaciones, accesos y documentación quedan a nombre de tu empresa.",
  },
  {
    title: "Lo que no se puede garantizar no se promete",
    text: "Te decimos qué es posible, cuánto toma y qué depende de terceros.",
  },
];

export default function NosotrosPage() {
  return (
    <>
      <JsonLd schema={[buildOrganizationSchema(), ...buildPeopleSchema()]} />

      <section aria-labelledby="nosotros-title" className="mx-auto w-full max-w-6xl px-4 pb-16 pt-28 sm:px-6 sm:pt-36 lg:px-8">
        <Eyebrow>Nosotros</Eyebrow>
        <h1 id="nosotros-title" className="mt-4 max-w-4xl text-balance text-4xl font-bold leading-[1.05] sm:text-6xl">
          De operar negocios digitales a construir los <span className="imt-text-glow">sistemas que les faltan</span>.
        </h1>
        <div className="mt-8 grid max-w-4xl gap-5 text-pretty text-lg leading-relaxed text-imt-muted md:grid-cols-2">
          <p>
            Después de años operando negocios digitales vimos el mismo patrón una y otra vez: empresas que ya venden,
            pero que crecen a punta de tareas manuales, hojas de cálculo y personas que no pueden faltar.
          </p>
          <p>
            IA Master Tech nace para cerrar esa brecha: ser el equipo de desarrollo que esas empresas no tienen, con
            estrategia y código trabajando juntos y una entrega funcionando cada semana.
          </p>
        </div>
      </section>

      <Section labelledBy="equipo-title" className="border-t border-imt-border bg-imt-elev">
        <SectionHeader id="equipo-title" eyebrow="Quiénes construyen" title="Estrategia y código en la misma mesa." />
        <ul className="mt-12 grid gap-4 md:grid-cols-2">
          {TEAM.map((member, i) => (
            <Card key={member.slug} as="li" reveal delay={i * 100}>
              <article id={member.slug} className="scroll-mt-28">
                <TeamAvatar photo={member.photo} name={member.name} initials={member.initials} className="w-40" sizes="160px" />
                <h3 className="mt-6 text-2xl font-bold">{member.name}</h3>
                <p className="mt-1 font-imt-mono text-xs uppercase tracking-[0.16em] text-imt-cyan">{member.role}</p>
                <ul className="mt-4 space-y-2">
                  {(BIOS[member.slug] ?? member.bio).map((line) => (
                    <li key={line} className="text-pretty leading-relaxed text-imt-muted">
                      {line}
                    </li>
                  ))}
                </ul>
              </article>
            </Card>
          ))}
        </ul>
      </Section>

      <Section labelledBy="valores-title">
        <SectionHeader id="valores-title" eyebrow="Cómo trabajamos" title="Tres reglas que no negociamos." />
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {VALUES.map((value, i) => (
            <Card key={value.title} as="li" reveal delay={i * 100}>
              <span className="font-imt-mono text-sm text-imt-cyan">0{i + 1}</span>
              <h3 className="mt-4 text-xl font-bold">{value.title}</h3>
              <p className="mt-3 text-pretty leading-relaxed text-imt-muted">{value.text}</p>
            </Card>
          ))}
        </ol>

        <div data-reveal="" className="mt-16 flex flex-col items-start gap-6 rounded-3xl border border-imt-cyan bg-imt-bg p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <p className="max-w-xl text-balance font-imt-display text-2xl font-bold text-imt-text sm:text-3xl">
            Sin intermediarios: quien entiende tu negocio es quien lo construye.
          </p>
          <Button href="/diagnostico" size="lg">
            Agenda tu diagnóstico
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </Section>
    </>
  );
}
