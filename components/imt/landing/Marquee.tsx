import { CATEGORIES } from "@/content/imt";
import { DraggableMarquee } from "@/components/imt/ui/DraggableMarquee";

/** What we build, as a big marquee you can grab and fling. */
export function Marquee() {
  return (
    <div className="border-y border-imt-border py-6">
      <DraggableMarquee label="Qué construimos" speed={55}>
        {CATEGORIES.map((category) => (
          <span
            key={category}
            className="mx-6 flex shrink-0 items-center gap-6 font-imt-display text-3xl font-bold text-imt-text transition-colors hover:text-imt-accent sm:text-5xl"
          >
            {category}
            <span aria-hidden="true" className="size-3 rotate-45 bg-imt-accent" />
          </span>
        ))}
      </DraggableMarquee>
    </div>
  );
}
