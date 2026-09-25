import type { Metadata } from "next";
import Image from "next/image";
import { TEAM, VALUE_EXAMPLES } from "@/content/imt";
import { FlipCard } from "@/components/imt/ui/FlipCard";
import { TwoViews } from "@/components/imt/landing/TwoViews";
import { Card } from "@/components/imt/ui/Card";
import { Eyebrow } from "@/components/imt/ui/Eyebrow";
import { PageHeader } from "@/components/imt/ui/PageHeader";
import { TeamAvatar } from "@/components/imt/landing/TeamAvatar";
import { FinalCta } from "@/components/imt/landing/FinalCta";
import { JsonLd } from "@/components/shared/json-ld";
import { buildMetadata, buildOrganizationSchema, buildPeopleSchema } from "@/lib/seo";
import estudioImage from "@/public/images/imt/estudio.webp";

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

      <PageHeader
        id="nosotros-title"
        eyebrow="Nosotros"
        title={
          <>
            De operar negocios digitales a construir los <span className="imt-text-glow">sistemas que les faltan.</span>
          </>
        }
      />

      <section aria-label="Por qué nace IA Master Tech" className="relative pb-16 sm:pb-24">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16 lg:px-8">
          <figure data-reveal="" data-tilt="" className="imt-reveal-img overflow-hidden rounded-[2rem] border border-imt-border">
            <Image
              src={estudioImage}
              alt="Estudio de desarrollo de noche con dos puestos de trabajo, monitores con código y un tablero de estrategia"
              placeholder="blur"
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="h-auto w-full"
            />
          </figure>
          <div data-reveal="" className="space-y-5 text-pretty text-lg leading-relaxed text-imt-muted">
            <p>
              Después de años operando negocios digitales vimos el mismo patrón una y otra vez: empresas que ya venden,
              pero que crecen a punta de tareas manuales, hojas de cálculo y personas que no pueden faltar.
            </p>
            <p className="text-imt-text">
              IA Master Tech nace para cerrar esa brecha: ser el equipo de desarrollo que esas empresas no tienen, con
              estrategia y código trabajando juntos y una entrega funcionando cada semana.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="equipo-title" className="relative py-16 sm:py-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <header data-reveal="">
            <Eyebrow>Quiénes construyen</Eyebrow>
            <h2 id="equipo-title" className="mt-4 text-balance text-4xl font-bold leading-[1.05] sm:text-5xl">
              Estrategia y código en la misma mesa.
            </h2>
          </header>
          <ul className="mt-12 grid gap-5 md:grid-cols-2">
            {TEAM.map((member, i) => (
              <Card key={member.slug} as="li" reveal delay={i * 100} className="sm:p-10">
                <article id={member.slug} className="grid scroll-mt-28 gap-6 sm:grid-cols-[140px_1fr]">
                  <TeamAvatar photo={member.photo} name={member.name} initials={member.initials} className="w-32 sm:w-full" sizes="140px" />
                  <div>
                    <h3 className="text-3xl font-bold">{member.name}</h3>
                    <p className="mt-2 font-imt-mono text-xs uppercase tracking-[0.16em] text-imt-accent">{member.role}</p>
                    <ul className="mt-5 space-y-2">
                      {(BIOS[member.slug] ?? member.bio).map((line) => (
                        <li key={line} className="text-pretty leading-relaxed text-imt-muted">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </Card>
            ))}
          </ul>
          <p data-reveal="" className="mt-12 text-center font-imt-display text-2xl font-medium text-imt-text sm:text-3xl">
            Sin intermediarios: <span className="text-imt-accent">quien entiende tu negocio es quien lo construye.</span>
          </p>
        </div>
      </section>

      <TwoViews />

      <section aria-labelledby="valores-title" className="relative py-16 sm:py-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <header data-reveal="">
            <Eyebrow>Cómo trabajamos</Eyebrow>
            <h2 id="valores-title" className="mt-4 text-balance text-4xl font-bold leading-[1.05] sm:text-5xl">
              Tres reglas que no negociamos.
            </h2>
          </header>
          <p data-reveal="" className="mt-4 text-imt-muted">Toca una tarjeta (o pasa el mouse) para ver cómo se ve en la práctica.</p>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {VALUES.map((value, i) => (
              <li key={value.title} data-reveal="" style={{ "--reveal-delay": `${i * 100}ms` } as React.CSSProperties}>
                <FlipCard
                  label={value.title}
                  className="h-full"
                  back={VALUE_EXAMPLES[i]}
                  front={
                    <span className="block">
                      <span className="block font-imt-display text-6xl font-bold text-imt-accent">0{i + 1}</span>
                      <span className="mt-6 block font-imt-display text-2xl font-bold text-imt-text">{value.title}</span>
                      <span className="mt-3 block text-pretty leading-relaxed text-imt-muted">{value.text}</span>
                    </span>
                  }
                />
              </li>
            ))}
          </ol>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
