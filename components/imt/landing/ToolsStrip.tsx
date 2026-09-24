import { TOOLS } from "@/content/imt";

function Track({ hidden }: { hidden?: boolean }) {
  return (
    <ul className="imt-marquee-track gap-3 pr-3" aria-hidden={hidden ? "true" : undefined}>
      {TOOLS.map((tool) => (
        <li
          key={tool}
          className="flex shrink-0 items-center gap-2.5 rounded-full border border-imt-border bg-imt-surface px-5 py-2.5 font-imt-display text-base font-medium text-imt-text"
        >
          <span aria-hidden="true" className="size-2 rounded-full bg-imt-accent shadow-[0_0_12px_rgba(163,230,53,0.8)]" />
          {tool}
        </li>
      ))}
    </ul>
  );
}

/** "We connect what you already use": infinite chip marquee. */
export function ToolsStrip() {
  return (
    <section aria-labelledby="herramientas-title" className="relative py-12 sm:py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2
          id="herramientas-title"
          data-reveal=""
          className="text-center font-imt-mono text-xs font-medium uppercase tracking-[0.24em] text-imt-muted"
        >
          Conectamos las herramientas que ya usas
        </h2>
      </div>
      <div data-reveal="" className="imt-marquee mt-8">
        <Track />
        <Track hidden />
      </div>
    </section>
  );
}
