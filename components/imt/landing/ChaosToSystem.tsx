"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Check } from "lucide-react";
import { Eyebrow } from "@/components/imt/ui/Eyebrow";

/*
 * "Del caos al sistema": a pinned, scroll-driven scene. Four pieces of manual
 * work (a broken spreadsheet, a chat, a sticky note, a paper invoice) fly in
 * scattered and snap into place around a central system; the wiring draws
 * itself and data starts flowing. Every piece swaps its "operar" face for its
 * "escalar" face. Illustrative content only (no clients, no metrics).
 */

type Slot = {
  id: string;
  left: string;
  top: string;
  /** Scattered start, as a % of the piece's own size, always pointing inward so it never leaves the stage. */
  chaos: { x: number; y: number; rotate: number };
  operar: ReactNode;
  escalar: { title: string; detail: string };
  wire: string;
};

function Sheet() {
  return (
    <div className="rounded-lg bg-[#e9ece4] p-2 font-imt-mono text-[10px] leading-tight text-[#2b2f28] shadow-xl sm:text-[11px]">
      <div className="mb-1 font-bold">cotizacion_final_v7.xlsx</div>
      {["Cliente", "Cantidad", "Precio", "Total"].map((cell, i) => (
        <div key={cell} className="grid grid-cols-2 border-b border-[#c9cec1] py-0.5">
          <span>{cell}</span>
          <span className={i === 3 ? "font-bold text-[#c0392b]" : ""}>{i === 3 ? "#¡REF!" : "…"}</span>
        </div>
      ))}
    </div>
  );
}

function Chat() {
  return (
    <div className="space-y-1.5 rounded-2xl bg-[#101a14] p-2.5 text-[11px] leading-snug shadow-xl sm:text-xs">
      <p className="w-fit rounded-xl rounded-tl-sm bg-[#1f2c22] px-2.5 py-1.5 text-[#e6f0e2]">¿Me confirmas el pedido? 🙏</p>
      <p className="ml-auto w-fit rounded-xl rounded-tr-sm bg-[#1f5e3a] px-2.5 py-1.5 text-[#e6f0e2]">Ya te lo paso a la hoja</p>
      <p className="w-fit rounded-xl rounded-tl-sm bg-[#1f2c22] px-2.5 py-1.5 text-[#e6f0e2]">¿?</p>
    </div>
  );
}

function StickyNote() {
  return (
    <div className="rotate-1 bg-[#f5e663] p-3 font-imt-display text-xs font-medium leading-snug text-[#3b3510] shadow-xl sm:text-sm">
      ¿Quién tiene el reporte de ventas de la semana?? 😩
    </div>
  );
}

function Invoice() {
  return (
    <div className="rounded-md bg-[#f4f1ea] p-3 text-[10px] leading-snug text-[#3a3a36] shadow-xl sm:text-[11px]">
      <div className="font-bold uppercase tracking-wider">Factura</div>
      <div className="mt-1 h-1.5 w-3/4 rounded bg-[#d6d2c7]" />
      <div className="mt-1 h-1.5 w-1/2 rounded bg-[#d6d2c7]" />
      <div className="mt-2 font-imt-mono text-[#c0392b]">Pendiente: digitar a mano</div>
    </div>
  );
}

const SLOTS: Slot[] = [
  {
    id: "cotizaciones",
    left: "25%",
    top: "25%",
    chaos: { x: 18, y: 45, rotate: -14 },
    operar: <Sheet />,
    escalar: { title: "Cotización generada", detail: "Sale sola desde tus datos" },
    wire: "M50 50 H38 V25 H25",
  },
  {
    id: "pedidos",
    left: "75%",
    top: "25%",
    chaos: { x: -22, y: 60, rotate: 11 },
    operar: <Chat />,
    escalar: { title: "Pedido sincronizado", detail: "De WhatsApp a tu sistema" },
    wire: "M50 50 H62 V25 H75",
  },
  {
    id: "reportes",
    left: "25%",
    top: "75%",
    chaos: { x: 25, y: -55, rotate: 16 },
    operar: <StickyNote />,
    escalar: { title: "Tablero en vivo", detail: "Las cifras del día, siempre" },
    wire: "M50 50 H38 V75 H25",
  },
  {
    id: "facturas",
    left: "75%",
    top: "75%",
    chaos: { x: -15, y: -50, rotate: -9 },
    operar: <Invoice />,
    escalar: { title: "Factura enviada", detail: "Directo a contabilidad" },
    wire: "M50 50 H62 V75 H75",
  },
];

function Piece({ slot, progress, gentle }: { slot: Slot; progress: MotionValue<number>; gentle: boolean }) {
  // Gentle mode (reduced motion): a short, unrotated drift instead of a flying pile.
  const k = gentle ? 0.3 : 1;
  const x = useTransform(progress, [0.08, 0.5], [`${slot.chaos.x * k}%`, "0%"]);
  const y = useTransform(progress, [0.08, 0.5], [`${slot.chaos.y * k}%`, "0%"]);
  const rotate = useTransform(progress, [0.08, 0.5], [gentle ? 0 : slot.chaos.rotate, 0]);
  const operarOpacity = useTransform(progress, [0.42, 0.56], [1, 0]);
  const escalarOpacity = useTransform(progress, [0.46, 0.6], [0, 1]);
  const escalarScale = useTransform(progress, [0.46, 0.6], [0.9, 1]);

  return (
    <motion.div
      // Centering uses the CSS `translate` property (Tailwind v4), which composes with framer's `transform`.
      className="absolute w-[40%] -translate-x-1/2 -translate-y-1/2 sm:w-[30%] lg:w-[25%]"
      style={{ left: slot.left, top: slot.top, x, y, rotate }}
    >
      <motion.div style={{ opacity: operarOpacity }} aria-hidden="true">
        {slot.operar}
      </motion.div>
      <motion.div
        style={{ opacity: escalarOpacity, scale: escalarScale }}
        className="absolute inset-0 flex items-center"
        aria-hidden="true"
      >
        <div className="w-full rounded-xl border border-imt-accent bg-imt-bg/95 p-2.5 shadow-[0_0_28px_-10px_rgba(163,230,53,0.7)] sm:rounded-2xl sm:p-4 sm:shadow-[0_0_40px_-10px_rgba(163,230,53,0.7)]">
          <div className="flex items-start gap-2">
            <span className="mt-px inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-imt-accent text-imt-bg sm:size-6">
              <Check className="size-3 sm:size-3.5" strokeWidth={3} />
            </span>
            <span className="font-imt-display text-[13px] font-bold leading-tight text-imt-text sm:text-base">
              {slot.escalar.title}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-imt-muted sm:mt-1.5 sm:text-sm">{slot.escalar.detail}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Wire({ d, progress }: { d: string; progress: MotionValue<number> }) {
  const dash = useTransform(progress, [0.52, 0.75], [1, 0]);
  return (
    <>
      <path d={d} fill="none" stroke="#1a2614" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <motion.path
        d={d}
        pathLength={1}
        fill="none"
        stroke="#A3E635"
        strokeWidth="2"
        strokeDasharray="1"
        vectorEffect="non-scaling-stroke"
        style={{ strokeDashoffset: dash }}
      />
    </>
  );
}

export function ChaosToSystem() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  // Softer spring: pieces glide behind the scroll instead of snapping to it.
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.5 });
  const gentle = useReducedMotion() ?? false;
  const [ordered, setOrdered] = useState(false);

  useMotionValueEvent(progress, "change", (v) => setOrdered(v > 0.55));

  const coreScale = useTransform(progress, [0.45, 0.62], [0.4, 1]);
  const coreOpacity = useTransform(progress, [0.45, 0.62], [0, 1]);
  const flowOpacity = useTransform(progress, [0.72, 0.82], [0, 1]);
  const gridOpacity = useTransform(progress, [0.5, 0.8], [0, 1]);
  const bar = useTransform(progress, [0, 1], [0.02, 1]);

  const jumpTo = (end: boolean) => {
    const el = sectionRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const target = end ? top + el.offsetHeight - window.innerHeight : top;
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  return (
    <section ref={sectionRef} aria-labelledby="caos-title" className="relative h-[200vh] sm:h-[260vh]">
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden pb-3 pt-[76px] sm:pb-20 sm:pt-24">
        <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 sm:px-6 lg:px-8">
          {/* Compact header: it must never push the stage off-screen, so it shrinks first on short viewports. */}
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
            <div>
              <div className="[@media(max-height:560px)]:hidden">
                <Eyebrow>Baja despacio</Eyebrow>
              </div>
              <h2
                id="caos-title"
                className="mt-2 max-w-2xl text-balance text-[1.375rem] font-bold leading-[1.1] sm:mt-3 sm:text-4xl sm:leading-[1.05] lg:text-5xl [@media(max-height:760px)]:lg:text-4xl"
              >
                Así pasa tu operación del caos a un sistema.
              </h2>
            </div>
            <p
              role="status"
              className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-imt-border bg-imt-bg/90 px-3 py-1.5 text-xs font-medium sm:gap-2.5 sm:px-4 sm:py-2 sm:text-sm"
            >
              <span
                aria-hidden="true"
                className={
                  "size-2 rounded-full transition-[background-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:size-2.5 " +
                  (ordered ? "bg-imt-accent shadow-[0_0_12px_#A3E635]" : "bg-[#f0a3a3]")
                }
              />
              {ordered ? "Sistema en producción" : "Operando a mano"}
            </p>
          </div>

          {/* The stage takes whatever height is left, so the scene always fits the screen. */}
          <div className="relative mt-3 min-h-0 w-full flex-1 overflow-hidden rounded-3xl border border-imt-border bg-imt-bg/70 sm:mt-6 sm:rounded-[2rem] sm:backdrop-blur-sm">
            <motion.div aria-hidden="true" className="imt-dots absolute inset-0" style={{ opacity: gridOpacity }} />

            <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
              {SLOTS.map((slot) => (
                <Wire key={slot.id} d={slot.wire} progress={progress} />
              ))}
              <motion.g style={{ opacity: flowOpacity }} className="motion-reduce:hidden">
                {SLOTS.map((slot, i) => (
                  <circle key={slot.id} r="0.9" fill="#BEF264">
                    <animateMotion dur={`${2.2 + i * 0.35}s`} repeatCount="indefinite" path={slot.wire} keyPoints="1;0" keyTimes="0;1" calcMode="linear" />
                  </circle>
                ))}
              </motion.g>
            </svg>

            <motion.div
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 flex size-[4.5rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-imt-accent bg-imt-bg text-center shadow-[0_0_40px_-5px_rgba(163,230,53,0.8)] sm:size-28 sm:shadow-[0_0_60px_-5px_rgba(163,230,53,0.8)] lg:size-32"
              style={{ scale: coreScale, opacity: coreOpacity }}
            >
              <span className="font-imt-display text-[11px] font-bold leading-tight text-imt-accent sm:text-base">IA Master</span>
              <span className="font-imt-display text-[11px] font-bold leading-tight text-imt-text sm:text-base">Tech</span>
            </motion.div>

            {SLOTS.map((slot) => (
              <Piece key={slot.id} slot={slot} progress={progress} gentle={gentle} />
            ))}

            <p className="sr-only">
              Antes: cotizaciones en Excel con errores, pedidos por chat, reportes que nadie encuentra y facturas por
              digitar. Después: cotizaciones generadas, pedidos sincronizados, un tablero en vivo y facturas enviadas
              solas, todo conectado a un mismo sistema.
            </p>
          </div>

          <div className="mt-2 flex shrink-0 items-center gap-2 sm:mt-4 sm:gap-4">
            <button
              type="button"
              onClick={() => jumpTo(false)}
              aria-label="Ir al inicio de la escena: operar"
              className="inline-flex min-h-11 items-center rounded-full px-4 text-sm text-imt-muted transition-colors duration-300 hover:text-imt-text"
            >
              Operar
            </button>
            <div aria-hidden="true" className="relative h-1 flex-1 overflow-hidden rounded-full bg-imt-border-solid">
              <motion.div className="absolute inset-0 origin-left rounded-full bg-imt-accent" style={{ scaleX: bar }} />
            </div>
            <button
              type="button"
              onClick={() => jumpTo(true)}
              aria-label="Ir al final de la escena: escalar"
              className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium text-imt-accent transition-colors duration-300 hover:text-imt-text"
            >
              Escalar
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
