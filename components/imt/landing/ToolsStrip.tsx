import { TOOLS } from "@/content/imt";
import { DraggableMarquee } from "@/components/imt/ui/DraggableMarquee";

/** "We connect what you already use": a chip marquee you can grab and fling. */
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
      <div data-reveal="" className="mt-8">
        <DraggableMarquee label="Herramientas que conectamos">
          {TOOLS.map((tool) => (
            <span
              key={tool}
              className="mr-3 flex shrink-0 items-center gap-2.5 rounded-full border border-imt-border bg-imt-surface px-6 py-3 font-imt-display text-lg font-medium text-imt-text transition-colors hover:border-imt-accent"
            >
              <span aria-hidden="true" className="size-2 rounded-full bg-imt-accent shadow-[0_0_12px_rgba(163,230,53,0.8)]" />
              {tool}
            </span>
          ))}
        </DraggableMarquee>
      </div>
      <p className="mt-4 text-center text-xs text-imt-muted">Arrástralo y suéltalo con fuerza.</p>
    </section>
  );
}
