"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/*
 * Interactive background that explains the product: "operar vs. escalar".
 *
 * - Top of the page: nodes are scattered and drifting (manual, chaotic ops).
 * - Scrolling orders them into a circuit grid and data packets start flowing
 *   along it (systems). A small HUD shows the OPERAR → ESCALAR progress.
 * - Pointer (mouse or finger) connects nearby nodes and pushes them aside;
 *   click / tap sends a ripple that fires packets from that point.
 *
 * Plain Canvas 2D, no dependencies. Static single frame with
 * prefers-reduced-motion and on routes listed in STATIC_ROUTES.
 */

const STATIC_ROUTES = ["/diagnostico"];
const ACCENT = "163,230,53";
const HEAD = "#BEF264";

type SysNode = {
  ox: number; // ordered (grid) position
  oy: number;
  cx: number; // chaotic position
  cy: number;
  phase: number;
  x: number;
  y: number;
  glow: number;
};

type Packet = { from: number; to: number; t: number; speed: number };
type Ripple = { x: number; y: number; r: number; life: number };

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function SystemsCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const pathname = usePathname();
  const isStaticRoute = STATIC_ROUTES.some((route) => pathname?.startsWith(route));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Many Windows PCs report reduced motion just because "animation effects"
    // is off. Instead of freezing, run a gentle mode: slow drift, no ripples.
    const gentle = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animate = !isStaticRoute;
    const speed = gentle ? 0.35 : 1;

    let width = 0;
    let height = 0;
    let spacing = 96;
    let cols = 0;
    let rows = 0;
    let nodes: SysNode[] = [];
    // Which grid edges are circuit traces (the rest fade out once ordered).
    let traceRight = new Uint8Array(0);
    let traceDown = new Uint8Array(0);
    let degree = new Uint8Array(0);
    let packets: Packet[] = [];
    let ripples: Ripple[] = [];
    let progress = animate ? 0 : 0.85;
    let target = progress;
    let scrollBoost = 0;
    let lastScroll = window.scrollY;
    let maxPackets = 18;
    let frame = 0;
    let lastHud = -1;
    const pointer = { x: -9999, y: -9999, active: false };

    // Deterministic pseudo-random so the "chaos" layout is stable across resizes.
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      spacing = width < 640 ? 64 : width < 1024 ? 80 : 96;
      maxPackets = width < 640 ? 8 : 18;
      cols = Math.ceil(width / spacing) + 1;
      rows = Math.ceil(height / spacing) + 1;
      const offsetX = (width - (cols - 1) * spacing) / 2;
      const offsetY = (height - (rows - 1) * spacing) / 2;

      seed = 7;
      nodes = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const ox = offsetX + c * spacing;
          const oy = offsetY + r * spacing;
          const angle = rand() * Math.PI * 2;
          const dist = spacing * (0.5 + rand() * 1.6);
          nodes.push({
            ox,
            oy,
            cx: ox + Math.cos(angle) * dist,
            cy: oy + Math.sin(angle) * dist,
            phase: rand() * Math.PI * 2,
            x: ox,
            y: oy,
            glow: 0,
          });
        }
      }
      // Traces: biased random runs so they read as circuit tracks, not a grid.
      traceRight = new Uint8Array(nodes.length);
      traceDown = new Uint8Array(nodes.length);
      degree = new Uint8Array(nodes.length);
      for (let i = 0; i < nodes.length; i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        if (c < cols - 1) {
          const run = c > 0 && traceRight[i - 1] === 1;
          traceRight[i] = rand() < (run ? 0.64 : 0.26) ? 1 : 0;
        }
        if (r < rows - 1) {
          const run = r > 0 && traceDown[i - cols] === 1;
          traceDown[i] = rand() < (run ? 0.55 : 0.2) ? 1 : 0;
        }
      }
      for (let i = 0; i < nodes.length; i++) {
        if (traceRight[i]) {
          degree[i]++;
          degree[i + 1]++;
        }
        if (traceDown[i]) {
          degree[i]++;
          degree[i + cols]++;
        }
      }
      packets = [];
    };

    const isTrace = (a: number, b: number) => {
      if (b === a + 1) return traceRight[a] === 1;
      if (b === a - 1) return traceRight[b] === 1;
      if (b === a + cols) return traceDown[a] === 1;
      if (b === a - cols) return traceDown[b] === 1;
      return false;
    };

    const neighbors = (i: number) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const list: number[] = [];
      if (c > 0) list.push(i - 1);
      if (c < cols - 1) list.push(i + 1);
      if (r > 0) list.push(i - cols);
      if (r < rows - 1) list.push(i + cols);
      return list;
    };

    const traceNeighbors = (i: number) => {
      const all = neighbors(i);
      if (progress < 0.5) return all;
      const traces = all.filter((n) => isTrace(i, n));
      return traces.length ? traces : all;
    };

    const spawnPacket = (from?: number) => {
      let start = from ?? Math.floor(Math.random() * nodes.length);
      if (from === undefined && progress >= 0.5) {
        for (let k = 0; k < 12 && degree[start] === 0; k++) start = Math.floor(Math.random() * nodes.length);
      }
      const options = traceNeighbors(start);
      const to = options[Math.floor(Math.random() * options.length)];
      if (to === undefined) return;
      packets.push({ from: start, to, t: 0, speed: 0.012 + Math.random() * 0.018 });
    };

    const nearestNode = (x: number, y: number) => {
      let best = 0;
      let bestDist = Infinity;
      nodes.forEach((n, i) => {
        const d = (n.x - x) ** 2 + (n.y - y) ** 2;
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      return best;
    };

    const updateHud = (p: number) => {
      const pct = Math.round(p * 100);
      if (pct === lastHud) return;
      lastHud = pct;
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${Math.max(0.04, p)})`;
      if (labelRef.current) labelRef.current.textContent = `${pct}% · ${p < 0.5 ? "OPERAR" : "ESCALAR"}`;
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      const p = easeInOut(progress);
      const drift = 1 - p;
      const radius = width < 640 ? 110 : 170;

      // Positions: chaos → order, plus drift and pointer repulsion.
      for (const n of nodes) {
        const wobX = Math.sin(time * 0.0007 * speed + n.phase) * 18 * drift;
        const wobY = Math.cos(time * 0.0006 * speed + n.phase) * 18 * drift;
        let x = n.cx + wobX + (n.ox - n.cx - wobX) * p;
        let y = n.cy + wobY + (n.oy - n.cy - wobY) * p;
        if (pointer.active) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < radius) {
            const f = 1 - d / radius;
            x += (dx / d) * f * 16;
            y += (dy / d) * f * 16;
            n.glow = Math.max(n.glow, f);
          }
        }
        n.x = x;
        n.y = y;
        n.glow *= 0.94;
      }

      // Links between grid neighbours: faint and tangled in chaos, clean in order.
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        const c = i % cols;
        const pairs = [c < cols - 1 ? i + 1 : -1, i + cols < nodes.length ? i + cols : -1];
        for (const j of pairs) {
          if (j < 0) continue;
          const b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          // Chaos: short tangled links. Order: circuit traces with a light wave.
          const tidy = Math.min(1, Math.max(0, (2.6 * spacing - dist) / (1.6 * spacing)));
          const trace = isTrace(i, j);
          const wave = Math.pow(0.5 + 0.5 * Math.sin((a.ox + a.oy) * 0.0045 - time * 0.0012 * speed), 3);
          const ordered = trace ? 0.26 + 0.34 * wave : 0.02;
          const alpha = 0.12 * (1 - p) * tidy + ordered * p + 0.6 * Math.max(a.glow, b.glow);
          ctx.lineWidth = trace && p > 0.5 ? 1.4 : 1;
          if (alpha < 0.015) continue;
          ctx.strokeStyle = `rgba(${ACCENT},${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // Pointer spotlight (one translucent layer on a transparent canvas).
      if (pointer.active) {
        const spot = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, radius * 1.6);
        spot.addColorStop(0, `rgba(${ACCENT},0.16)`);
        spot.addColorStop(1, `rgba(${ACCENT},0)`);
        ctx.fillStyle = spot;
        ctx.fillRect(pointer.x - radius * 1.6, pointer.y - radius * 1.6, radius * 3.2, radius * 3.2);
      }

      // Pointer "connects" the nodes around it.
      if (pointer.active) {
        for (const n of nodes) {
          const d = Math.hypot(n.x - pointer.x, n.y - pointer.y);
          if (d > radius) continue;
          ctx.strokeStyle = `rgba(${ACCENT},${((1 - d / radius) * 0.6).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(pointer.x, pointer.y);
          ctx.lineTo(n.x, n.y);
          ctx.stroke();
        }
      }

      // Nodes: loose dots in chaos, solder pads on the traces once ordered.
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const pad = degree[i] > 0;
        const wave = Math.pow(0.5 + 0.5 * Math.sin((n.ox + n.oy) * 0.0045 - time * 0.0012 * speed), 3);
        const alpha = Math.min(1, 0.45 * (1 - p) + (pad ? 0.55 + 0.4 * wave : 0.06) * p + n.glow);
        ctx.fillStyle = `rgba(${ACCENT},${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2 + n.glow * 3.5, 0, Math.PI * 2);
        ctx.fill();
        if (pad && p > 0.4 && degree[i] !== 2) {
          ctx.strokeStyle = `rgba(${ACCENT},${(alpha * 0.7 * p).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 5.5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Packets travelling along the circuit.
      for (const pk of packets) {
        const a = nodes[pk.from];
        const b = nodes[pk.to];
        if (!a || !b) continue;
        const x = a.x + (b.x - a.x) * pk.t;
        const y = a.y + (b.y - a.y) * pk.t;
        const tail = Math.max(0, pk.t - 0.45);
        ctx.strokeStyle = `rgba(${ACCENT},0.55)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(a.x + (b.x - a.x) * tail, a.y + (b.y - a.y) * tail);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = `rgba(${ACCENT},0.18)`;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = HEAD;
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.lineWidth = 1;

      // Tap / click ripples.
      for (const rp of ripples) {
        ctx.strokeStyle = `rgba(${ACCENT},${(rp.life * 0.6).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.stroke();
      }

      updateHud(progress);
    };

    const step = (time: number) => {
      frame = 0;
      if (document.hidden) return;
      progress += (target - progress) * 0.06;
      scrollBoost *= 0.9;

      // A few erratic packets even in chaos; the full flow once ordered.
      const wanted = Math.floor(3 + easeInOut(progress) * (maxPackets - 3));
      if (packets.length < wanted && Math.random() < 0.3) spawnPacket();
      packets = packets.filter((pk) => {
        pk.t += pk.speed * speed * (1 + scrollBoost * 0.08);
        if (pk.t < 1) return true;
        // Arrived: continue to a random next neighbour (no immediate U-turn).
        if (packets.length > wanted + 6) return false;
        const next = traceNeighbors(pk.to).filter((n) => n !== pk.from);
        const to = next[Math.floor(Math.random() * next.length)];
        if (to === undefined) return false;
        pk.from = pk.to;
        pk.to = to;
        pk.t = 0;
        return true;
      });

      ripples = ripples.filter((rp) => {
        rp.r += 6;
        rp.life -= 0.022;
        for (const n of nodes) {
          const d = Math.hypot(n.x - rp.x, n.y - rp.y);
          if (Math.abs(d - rp.r) < 10) n.glow = Math.max(n.glow, rp.life);
        }
        return rp.life > 0;
      });

      draw(time);
      frame = requestAnimationFrame(step);
    };

    const start = () => {
      if (animate && !frame && !document.hidden) frame = requestAnimationFrame(step);
    };

    const computeTarget = () => {
      const max = Math.max(
        1,
        Math.min(document.documentElement.scrollHeight - window.innerHeight, window.innerHeight * 1.6),
      );
      target = Math.min(1, Math.max(0, window.scrollY / max));
      scrollBoost = Math.min(40, scrollBoost + Math.abs(window.scrollY - lastScroll));
      lastScroll = window.scrollY;
    };

    build();
    if (animate) {
      computeTarget();
      start();
    } else {
      draw(0);
    }

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        build();
        if (!animate) draw(0);
      }, 150);
    };
    const onScroll = () => computeTarget();
    const onPointerMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };
    const onPointerDown = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = e.pointerType === "mouse";
      if (!gentle) ripples.push({ x: e.clientX, y: e.clientY, r: 4, life: 1 });
      const origin = nearestNode(e.clientX, e.clientY);
      for (let i = 0; i < 4; i++) spawnPacket(origin);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") pointer.active = false;
    };
    const onVisibility = () => start();

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    if (animate) {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerdown", onPointerDown, { passive: true });
      window.addEventListener("pointerup", onPointerUp, { passive: true });
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
    }

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [isStaticRoute]);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 size-full [mask-image:radial-gradient(ellipse_90%_85%_at_50%_45%,#000_45%,transparent_100%)]" />
      {isStaticRoute ? null : (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed bottom-4 left-4 z-40 hidden items-center gap-3 rounded-full border border-imt-border bg-imt-bg/80 px-4 py-2 font-imt-mono text-[11px] uppercase tracking-[0.16em] text-imt-muted backdrop-blur sm:flex"
        >
          <span className="text-imt-accent">Sistema</span>
          <span className="relative h-1 w-20 overflow-hidden rounded-full bg-imt-border-solid">
            <span
              ref={fillRef}
              className="absolute inset-0 origin-left rounded-full bg-imt-accent"
              style={{ transform: "scaleX(0.04)" }}
            />
          </span>
          <span ref={labelRef}>0% · OPERAR</span>
        </div>
      )}
    </>
  );
}
