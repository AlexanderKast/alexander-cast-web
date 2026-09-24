import { CATEGORIES } from "@/content/imt";

function Track({ hidden }: { hidden?: boolean }) {
  return (
    <ul className="imt-marquee-track" aria-hidden={hidden ? "true" : undefined}>
      {CATEGORIES.map((category) => (
        <li
          key={category}
          className="mx-3 flex shrink-0 items-center gap-3 font-imt-mono text-sm uppercase tracking-[0.14em] text-imt-muted"
        >
          <span aria-hidden="true" className="size-1.5 rounded-full bg-imt-accent" />
          {category}
        </li>
      ))}
    </ul>
  );
}

/** Infinite, subtle category marquee. The duplicate track is hidden from AT. */
export function Marquee() {
  return (
    <div className="imt-marquee border-y border-imt-border py-5" role="region" aria-label="Qué construimos">
      <Track />
      <Track hidden />
    </div>
  );
}
