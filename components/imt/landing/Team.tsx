import { TEAM } from "@/content/imt";
import { Card } from "@/components/imt/ui/Card";
import { Section, SectionHeader } from "@/components/imt/ui/Section";
import { TeamAvatar } from "./TeamAvatar";

export function Team() {
  return (
    <Section id="equipo" labelledBy="equipo-title" className="border-t border-imt-border bg-imt-elev">
      <SectionHeader id="equipo-title" eyebrow="Quiénes construyen" title="Estrategia y código en la misma mesa." />

      <ul className="mt-12 grid gap-4 md:grid-cols-2">
        {TEAM.map((member, i) => (
          <Card key={member.slug} as="li" reveal delay={i * 100} className="grid gap-6 sm:grid-cols-[160px_1fr] sm:items-start">
            <TeamAvatar
              photo={member.photo}
              name={member.name}
              initials={member.initials}
              className="w-32 sm:w-full"
              sizes="160px"
            />
            <div>
              <h3 className="text-2xl font-bold">{member.name}</h3>
              <p className="mt-1 font-imt-mono text-xs uppercase tracking-[0.16em] text-imt-cyan">{member.role}</p>
              <ul className="mt-4 space-y-2">
                {member.bio.map((line) => (
                  <li key={line} className="text-pretty leading-relaxed text-imt-muted">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </ul>

      <p data-reveal="" className="mt-10 text-center font-imt-display text-xl font-medium text-imt-text sm:text-2xl">
        Sin intermediarios: <span className="text-imt-cyan">quien entiende tu negocio es quien lo construye.</span>
      </p>
    </Section>
  );
}
