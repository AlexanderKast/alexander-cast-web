import { ArrowRight } from "lucide-react";
import { Button } from "@/components/imt/ui/Button";
import { diagnosticoWhatsappUrl } from "@/site.config";

/** Closing call to action shared by every public page. */
export function FinalCta() {
  return (
    <section aria-labelledby="cierre-title" className="relative py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          data-reveal=""
          className="relative overflow-hidden rounded-[2.5rem] border border-imt-accent bg-imt-bg px-6 py-16 text-center shadow-[0_40px_140px_-50px_rgba(163,230,53,0.7)] sm:px-12 sm:py-24"
        >
          <p className="font-imt-mono text-xs uppercase tracking-[0.24em] text-imt-accent">De operar a escalar</p>
          <h2 id="cierre-title" className="mx-auto mt-5 max-w-4xl text-balance text-4xl font-bold leading-[1.05] sm:text-6xl">
            Tu empresa ya vende. <span className="imt-text-glow">Ahora necesita sistemas que crezcan con ella.</span>
          </h2>
          <div className="mt-10 flex justify-center">
            <Button href={diagnosticoWhatsappUrl()} external size="lg">
              Agenda tu diagnóstico
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
