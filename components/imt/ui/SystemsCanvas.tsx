"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/*
 * Interactive background that explains the product: "operar vs. escalar",
 * set inside a slowly turning galaxy.
 *
 * - Top of the page: nodes are scattered and drifting (manual, chaotic ops).
 * - Scrolling orders them into a circuit and data packets start flowing
 *   along it (systems). A small HUD shows the OPERAR → ESCALAR progress.
 * - Further down, the circuit twists into spiral arms around a galaxy whose
 *   core wanders with the scroll, so the page never settles into a static grid.
 * - Pointer (mouse or finger) connects nearby nodes and pushes them aside;
 *   click / tap sends a ripple that fires packets from that point.
 *
 * Performance: plain Canvas 2D, no dependencies. Draw calls are batched by
 * alpha bucket, gradients are pre-rendered sprites and no strings or arrays
 * are allocated per frame. Phones / touch run a lite mode (fewer elements,
 * DPR 1, ~30 fps) and slow desktops degrade to 30 fps automatically. The loop
 * pauses while the tab is hidden. prefers-reduced-motion runs a gentle mode
 * (slower, softer) instead of freezing, because many Windows PCs report it
 * just because "animation effects" is off. Routes in STATIC_ROUTES get one
 * static frame. If Canvas 2D is unavailable a CSS gradient stands in.
 */

// Every public route animates (the form included, per the client).
const STATIC_ROUTES: string[] = [];
const LIME = "#A3E635";
const GREEN = "#22C55E";
const HEAD = "#BEF264";
const PALE = "#F7FEE7";
const TAU = Math.PI * 2;
/** Alpha levels used to batch strokes/fills into a few draw calls. */
const BUCKETS = 12;
const SKIP = 255;

type Star = { x: number; y: number; z: number; size: number; phase: number; lime: boolean };
type Dust = { t: number; arm: number; jx: number; jy: number; size: number; phase: number; hue: 0 | 1 | 2 };
type Packet = { from: number; to: number; t: number; speed: number };
type Ripple = { x: number; y: number; r: number; life: number };

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Squared mapping gives finer alpha steps where faint lines live. */
function toBucket(alpha: number) {
  if (alpha < 0.012) return SKIP;
  return Math.min(BUCKETS - 1, Math.floor(Math.sqrt(Math.min(alpha, 1)) * BUCKETS));
}
function bucketAlpha(bucket: number) {
  const v = (bucket + 0.5) / BUCKETS;
  return v * v;
}

/** Pre-renders a radial glow once; drawing it later is a cheap drawImage. */
function makeGlowSprite(size: number, color: string, stops: Array<[number, number]>) {
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const sctx = sprite.getContext("2d");
  if (!sctx) return null;
  const half = size / 2;
  const gradient = sctx.createRadialGradient(half, half, 0, half, half, half);
  for (const [offset, alpha] of stops) gradient.addColorStop(offset, hexToRgba(color, alpha));
  sctx.fillStyle = gradient;
  sctx.fillRect(0, 0, size, size);
  return sprite;
}

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function SystemsCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const pathname = usePathname();
  const isStaticRoute = STATIC_ROUTES.some((route) => pathname?.startsWith(route));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let context: CanvasRenderingContext2D | null = null;
    try {
      context = canvas.getContext("2d", { alpha: true });
    } catch {
      context = null;
    }
    if (!context) {
      // No Canvas 2D (blocked, old browser, GPU blacklisted): static CSS galaxy.
      canvas.dataset.fallback = "true";
      return;
    }
    const ctx = context;
    delete canvas.dataset.fallback;

    const gentle = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)");
    const animate = !isStaticRoute;
    const speed = gentle ? 0.35 : 1;

    let width = 0;
    let height = 0;
    let spacing = 96;
    let cols = 0;
    let rows = 0;
    let count = 0;
    let centerX = 0;
    let centerY = 0;
    let lite = false;

    // Node data in typed arrays: no per-frame object churn.
    let ox = new Float32Array(0); // ordered (grid) position
    let oy = new Float32Array(0);
    let cx = new Float32Array(0); // chaotic position
    let cy = new Float32Array(0);
    let phase = new Float32Array(0);
    let swirlW = new Float32Array(0); // how much the galaxy twist affects the node
    let nx = new Float32Array(0); // current screen position
    let ny = new Float32Array(0);
    let glow = new Float32Array(0);
    let wave = new Float32Array(0);
    let degree = new Uint8Array(0);
    let nodeBucket = new Uint8Array(0);
    let padBucket = new Uint8Array(0);
    let traceRight = new Uint8Array(0);
    let traceDown = new Uint8Array(0);
    // Links (right + down neighbours), precomputed once per layout.
    let linkA = new Int32Array(0);
    let linkB = new Int32Array(0);
    let linkTrace = new Uint8Array(0);
    let linkBucket = new Uint8Array(0);
    const bucketCount = new Uint16Array(BUCKETS * 2);
    const scratchAll = new Int32Array(4);
    const scratchTrace = new Int32Array(4);

    let stars: Star[] = [];
    let dust: Dust[] = [];
    const packets: Packet[] = [];
    const ripples: Ripple[] = [];
    let maxPackets = 18;

    let nebulaSprite: HTMLCanvasElement | null = null;
    let greenSprite: HTMLCanvasElement | null = null;
    let coreSprite: HTMLCanvasElement | null = null;
    let packetSprite: HTMLCanvasElement | null = null;
    let spotSprite: HTMLCanvasElement | null = null;

    let progress = animate ? 0 : 0.85;
    let target = progress;
    let smoothScroll = window.scrollY;
    let scrollBoost = 0;
    let lastScroll = window.scrollY;
    let frame = 0;
    let lastHud = -1;
    let lastTime = 0;
    let lastDraw = 0;
    // Adaptive frame budget: 0 = every frame, 33 = ~30 fps.
    let budget = 0;
    let slowFrames = 0;
    let sampledFrames = 0;
    const pointer = { x: -9999, y: -9999, active: false, touchUntil: 0 };

    // Deterministic pseudo-random so the layout is stable across resizes.
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const buildSprites = () => {
      if (nebulaSprite) return;
      nebulaSprite = makeGlowSprite(256, LIME, [
        [0, 0.12],
        [0.35, 0.05],
        [1, 0],
      ]);
      greenSprite = makeGlowSprite(256, GREEN, [
        [0, 0.08],
        [1, 0],
      ]);
      coreSprite = makeGlowSprite(128, HEAD, [
        [0, 0.55],
        [0.25, 0.16],
        [1, 0],
      ]);
      packetSprite = makeGlowSprite(32, LIME, [
        [0, 0.4],
        [1, 0],
      ]);
      spotSprite = makeGlowSprite(256, LIME, [
        [0, 0.16],
        [1, 0],
      ]);
    };

    const build = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      // Weak hardware (few cores / little memory) also gets the lite mode.
      const nav = navigator as Navigator & { deviceMemory?: number };
      const weak = (navigator.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
      lite = width < 768 || coarse.matches || weak;
      budget = lite ? 33 : 0;
      slowFrames = 0;
      sampledFrames = 0;
      const dpr = lite ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      spacing = lite ? 92 : width < 1024 ? 84 : 96;
      maxPackets = lite ? 7 : 18;
      centerX = width / 2;
      centerY = height / 2;
      // Cover the screen diagonal so the rotation never shows empty corners.
      const side = Math.hypot(width, height) + spacing * 2;
      cols = Math.ceil(side / spacing) + 1;
      rows = cols;
      count = cols * rows;
      const offsetX = centerX - ((cols - 1) * spacing) / 2;
      const offsetY = centerY - ((rows - 1) * spacing) / 2;
      const maxR = Math.hypot(((cols - 1) * spacing) / 2, ((rows - 1) * spacing) / 2) || 1;

      ox = new Float32Array(count);
      oy = new Float32Array(count);
      cx = new Float32Array(count);
      cy = new Float32Array(count);
      phase = new Float32Array(count);
      swirlW = new Float32Array(count);
      nx = new Float32Array(count);
      ny = new Float32Array(count);
      glow = new Float32Array(count);
      wave = new Float32Array(count);
      degree = new Uint8Array(count);
      nodeBucket = new Uint8Array(count);
      padBucket = new Uint8Array(count);
      traceRight = new Uint8Array(count);
      traceDown = new Uint8Array(count);

      seed = 7;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const x = offsetX + c * spacing;
          const y = offsetY + r * spacing;
          const angle = rand() * TAU;
          const dist = spacing * (0.5 + rand() * 1.6);
          ox[i] = x;
          oy[i] = y;
          cx[i] = x + Math.cos(angle) * dist;
          cy[i] = y + Math.sin(angle) * dist;
          phase[i] = rand() * TAU;
          nx[i] = x;
          ny[i] = y;
          // Inner nodes turn more than outer ones: a grid becomes spiral arms.
          const rn = Math.hypot(x - centerX, y - centerY) / maxR;
          swirlW[i] = Math.pow(1 - Math.min(1, rn), 1.6);
        }
      }

      // Traces: biased random runs so they read as circuit tracks, not a grid.
      for (let i = 0; i < count; i++) {
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
      let links = 0;
      for (let i = 0; i < count; i++) {
        if (i % cols < cols - 1) links++;
        if (i + cols < count) links++;
      }
      linkA = new Int32Array(links);
      linkB = new Int32Array(links);
      linkTrace = new Uint8Array(links);
      linkBucket = new Uint8Array(links);
      let k = 0;
      for (let i = 0; i < count; i++) {
        if (i % cols < cols - 1) {
          linkA[k] = i;
          linkB[k] = i + 1;
          linkTrace[k] = traceRight[i];
          if (traceRight[i]) {
            degree[i]++;
            degree[i + 1]++;
          }
          k++;
        }
        if (i + cols < count) {
          linkA[k] = i;
          linkB[k] = i + cols;
          linkTrace[k] = traceDown[i];
          if (traceDown[i]) {
            degree[i]++;
            degree[i + cols]++;
          }
          k++;
        }
      }
      packets.length = 0;

      // Starfield in three depths (drawn behind everything).
      const starCount = lite ? 70 : 170;
      stars = Array.from({ length: starCount }, () => ({
        x: rand() * width,
        y: rand() * height,
        z: 0.25 + rand() * 0.75,
        size: rand() < 0.12 ? 2 : 1,
        phase: rand() * TAU,
        lime: rand() < 0.25,
      }));

      // Galaxy dust along two logarithmic-looking spiral arms.
      const dustCount = lite ? 110 : 300;
      dust = Array.from({ length: dustCount }, () => {
        const t = Math.pow(rand(), 0.7);
        const roll = rand();
        return {
          t,
          arm: rand() < 0.5 ? 0 : 1,
          jx: (rand() - 0.5) * 2,
          jy: (rand() - 0.5) * 2,
          size: rand() < 0.1 ? 2 : 1,
          phase: rand() * TAU,
          hue: roll < 0.45 ? 0 : roll < 0.7 ? 1 : 2,
        };
      });
      buildSprites();
    };

    const isTrace = (a: number, b: number) => {
      if (b === a + 1) return traceRight[a] === 1;
      if (b === a - 1) return traceRight[b] === 1;
      if (b === a + cols) return traceDown[a] === 1;
      if (b === a - cols) return traceDown[b] === 1;
      return false;
    };

    /** Random next hop from node i (no U-turn to `exclude`); -1 if stuck. */
    const pickNext = (i: number, exclude: number) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      let all = 0;
      let traces = 0;
      const consider = (n: number) => {
        if (n === exclude) return;
        scratchAll[all++] = n;
        if (isTrace(i, n)) scratchTrace[traces++] = n;
      };
      if (c > 0) consider(i - 1);
      if (c < cols - 1) consider(i + 1);
      if (r > 0) consider(i - cols);
      if (r < rows - 1) consider(i + cols);
      if (progress >= 0.5 && traces > 0) return scratchTrace[Math.floor(Math.random() * traces)];
      if (all === 0) return -1;
      return scratchAll[Math.floor(Math.random() * all)];
    };

    const spawnPacket = (from?: number) => {
      if (!count) return;
      let start = from ?? Math.floor(Math.random() * count);
      if (from === undefined && progress >= 0.5) {
        for (let k = 0; k < 12 && degree[start] === 0; k++) start = Math.floor(Math.random() * count);
      }
      const to = pickNext(start, -1);
      if (to < 0) return;
      packets.push({ from: start, to, t: 0, speed: 0.012 + Math.random() * 0.018 });
    };

    const nearestNode = (x: number, y: number) => {
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < count; i++) {
        const d = (nx[i] - x) ** 2 + (ny[i] - y) ** 2;
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
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
      ctx.globalAlpha = 1;
      const p = easeInOut(progress);
      const scroll = smoothScroll;
      const depth = scroll / Math.max(1, height); // viewports scrolled
      const deep = smoothstep(0.9, 2.6, depth);
      const tSlow = time * speed;

      // ── Galaxy core + nebula: wanders across the screen with the scroll ──
      const gx = width * (0.5 + 0.3 * Math.sin(depth * 0.55 + 0.6));
      const gy = height * (0.46 + 0.2 * Math.cos(depth * 0.43));
      const galaxyR = Math.max(width, height) * (lite ? 0.5 : 0.42);
      const galaxyVis = 0.55 + 0.45 * smoothstep(0, 1.5, depth);
      if (nebulaSprite) {
        const nr = Math.max(width, height) * 0.7;
        ctx.globalAlpha = 0.9;
        ctx.drawImage(nebulaSprite, gx - nr, gy - nr, nr * 2, nr * 2);
      }
      if (greenSprite) {
        const gr = Math.max(width, height) * 0.45;
        const ax = width - gx * 0.6;
        const ay = height * (0.7 - 0.25 * Math.sin(depth * 0.37));
        ctx.globalAlpha = 0.8;
        ctx.drawImage(greenSprite, ax - gr, ay - gr, gr * 2, gr * 2);
      }
      if (coreSprite) {
        const cr = galaxyR * 0.28 * (0.92 + 0.08 * Math.sin(tSlow * 0.0011));
        ctx.globalAlpha = galaxyVis * 0.75;
        ctx.drawImage(coreSprite, gx - cr, gy - cr, cr * 2, cr * 2);
      }

      // ── Stars: parallax with scroll (deeper = slower) and a soft twinkle ──
      for (let pass = 0; pass < 2; pass++) {
        ctx.fillStyle = pass === 0 ? LIME : PALE;
        for (const st of stars) {
          if (st.lime !== (pass === 0)) continue;
          let y = (st.y - scroll * st.z * 0.35) % height;
          if (y < 0) y += height;
          const tw = 0.35 + 0.65 * Math.abs(Math.sin(tSlow * 0.0008 + st.phase));
          ctx.globalAlpha = (0.25 + 0.55 * st.z) * tw * (pass === 0 ? 1 : 0.8);
          ctx.fillRect(st.x, y, st.size, st.size);
        }
      }

      // ── Galaxy dust: two spiral arms, inner parts turn faster ──
      const spin = tSlow * 0.00004 + scroll * 0.00035;
      const tilt = -0.5 + depth * 0.12;
      const tc = Math.cos(tilt);
      const ts = Math.sin(tilt);
      for (let hue = 0; hue < 3; hue++) {
        ctx.fillStyle = hue === 0 ? LIME : hue === 1 ? GREEN : PALE;
        for (const d of dust) {
          if (d.hue !== hue) continue;
          const r = d.t * galaxyR;
          const theta = d.arm * Math.PI + d.t * 5 + spin * (1.8 - d.t);
          const spread = 6 + r * 0.14;
          const lx = Math.cos(theta) * r + d.jx * spread;
          const ly = (Math.sin(theta) * r + d.jy * spread) * 0.5;
          const x = gx + lx * tc - ly * ts;
          const y = gy + lx * ts + ly * tc;
          if (x < -4 || y < -4 || x > width + 4 || y > height + 4) continue;
          const tw = 0.55 + 0.45 * Math.sin(tSlow * 0.0015 + d.phase);
          ctx.globalAlpha = (1 - d.t * 0.75) * tw * 0.75 * galaxyVis;
          ctx.fillRect(x, y, d.size, d.size);
        }
      }

      // ── Circuit positions: chaos → order, then twisted by the galaxy ──
      const angle = scroll * 0.00016 + tSlow * 0.000012;
      const swirl = deep * (0.55 + 0.35 * Math.sin(depth * 0.8)) * 1.1;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const drift = 1 - p;
      const radius = width < 640 ? 110 : 170;
      const circuitAlpha = 1 - 0.3 * deep;
      const wob1 = tSlow * 0.0007;
      const wob2 = tSlow * 0.0006;
      const waveT = tSlow * 0.0012;

      for (let i = 0; i < count; i++) {
        let bx: number;
        let by: number;
        if (drift > 0.001) {
          const wx = Math.sin(wob1 + phase[i]) * 18 * drift;
          const wy = Math.cos(wob2 + phase[i]) * 18 * drift;
          bx = cx[i] + wx + (ox[i] - cx[i] - wx) * p - centerX;
          by = cy[i] + wy + (oy[i] - cy[i] - wy) * p - centerY;
        } else {
          bx = ox[i] - centerX;
          by = oy[i] - centerY;
        }
        let c = cosA;
        let s = sinA;
        if (swirl > 0.001) {
          const a = angle + swirl * swirlW[i];
          c = Math.cos(a);
          s = Math.sin(a);
        }
        let x = centerX + bx * c - by * s;
        let y = centerY + bx * s + by * c;
        if (pointer.active) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          if (d < radius) {
            const f = 1 - d / radius;
            x += (dx / d) * f * 16;
            y += (dy / d) * f * 16;
            if (f > glow[i]) glow[i] = f;
          }
        }
        nx[i] = x;
        ny[i] = y;
        glow[i] *= 0.94;
        wave[i] = Math.pow(0.5 + 0.5 * Math.sin((ox[i] + oy[i]) * 0.0045 - waveT), 3);
      }

      // ── Links: faint and tangled in chaos, clean circuit traces in order ──
      bucketCount.fill(0);
      const wideTraces = p > 0.5;
      for (let k = 0; k < linkA.length; k++) {
        const a = linkA[k];
        const b = linkB[k];
        const trace = linkTrace[k] === 1;
        let chaosPart = 0;
        if (drift > 0.01) {
          const dx = nx[a] - nx[b];
          const dy = ny[a] - ny[b];
          const dist = Math.sqrt(dx * dx + dy * dy);
          const tidy = Math.min(1, Math.max(0, (2.6 * spacing - dist) / (1.6 * spacing)));
          chaosPart = 0.12 * drift * tidy;
        }
        const ordered = trace ? 0.26 + 0.34 * wave[a] : 0.008;
        const g = glow[a] > glow[b] ? glow[a] : glow[b];
        const bucket = toBucket((chaosPart + ordered * p) * circuitAlpha + 0.6 * g);
        if (bucket === SKIP) {
          linkBucket[k] = SKIP;
          continue;
        }
        const slot = trace && wideTraces ? bucket + BUCKETS : bucket;
        linkBucket[k] = slot;
        bucketCount[slot]++;
      }
      ctx.strokeStyle = LIME;
      for (let slot = 0; slot < BUCKETS * 2; slot++) {
        if (!bucketCount[slot]) continue;
        ctx.globalAlpha = bucketAlpha(slot % BUCKETS);
        ctx.lineWidth = slot >= BUCKETS ? 1.4 : 1;
        ctx.beginPath();
        for (let k = 0; k < linkA.length; k++) {
          if (linkBucket[k] !== slot) continue;
          ctx.moveTo(nx[linkA[k]], ny[linkA[k]]);
          ctx.lineTo(nx[linkB[k]], ny[linkB[k]]);
        }
        ctx.stroke();
      }
      ctx.lineWidth = 1;

      // ── Pointer spotlight + the lines that "connect" nodes to it ──
      if (pointer.active) {
        if (!lite && spotSprite) {
          const sr = radius * 1.6;
          ctx.globalAlpha = 1;
          ctx.drawImage(spotSprite, pointer.x - sr, pointer.y - sr, sr * 2, sr * 2);
        }
        for (let i = 0; i < count; i++) {
          const dx = nx[i] - pointer.x;
          const dy = ny[i] - pointer.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > radius) continue;
          ctx.globalAlpha = (1 - d / radius) * 0.6;
          ctx.beginPath();
          ctx.moveTo(pointer.x, pointer.y);
          ctx.lineTo(nx[i], ny[i]);
          ctx.stroke();
        }
      }

      // ── Nodes: loose dots in chaos, solder pads on the traces once ordered ──
      bucketCount.fill(0);
      const showPads = p > 0.4;
      for (let i = 0; i < count; i++) {
        const pad = degree[i] > 0;
        const base = 0.45 * drift + (pad ? 0.55 + 0.4 * wave[i] : 0.06) * p;
        const alpha = Math.min(1, base * circuitAlpha + glow[i]);
        const bucket = toBucket(alpha);
        nodeBucket[i] = bucket;
        if (bucket !== SKIP) bucketCount[bucket]++;
        padBucket[i] = pad && showPads && degree[i] !== 2 ? toBucket(alpha * 0.7 * p) : SKIP;
        if (padBucket[i] !== SKIP) bucketCount[padBucket[i] + BUCKETS]++;
      }
      const dotBase = lite ? 1.8 : 2;
      ctx.fillStyle = LIME;
      for (let b = 0; b < BUCKETS; b++) {
        if (!bucketCount[b]) continue;
        ctx.globalAlpha = bucketAlpha(b);
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
          if (nodeBucket[i] !== b) continue;
          const r = dotBase + glow[i] * 3.5;
          ctx.moveTo(nx[i] + r, ny[i]);
          ctx.arc(nx[i], ny[i], r, 0, TAU);
        }
        ctx.fill();
      }
      for (let b = 0; b < BUCKETS; b++) {
        if (!bucketCount[b + BUCKETS]) continue;
        ctx.globalAlpha = bucketAlpha(b);
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
          if (padBucket[i] !== b) continue;
          ctx.moveTo(nx[i] + 5.5, ny[i]);
          ctx.arc(nx[i], ny[i], 5.5, 0, TAU);
        }
        ctx.stroke();
      }

      // ── Packets travelling along the circuit (tails, glows, heads) ──
      if (packets.length) {
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (const pk of packets) {
          const ax = nx[pk.from];
          const ay = ny[pk.from];
          const tail = Math.max(0, pk.t - 0.45);
          ctx.moveTo(ax + (nx[pk.to] - ax) * tail, ay + (ny[pk.to] - ay) * tail);
          ctx.lineTo(ax + (nx[pk.to] - ax) * pk.t, ay + (ny[pk.to] - ay) * pk.t);
        }
        ctx.stroke();
        ctx.lineWidth = 1;
        if (packetSprite) {
          ctx.globalAlpha = 1;
          for (const pk of packets) {
            const x = nx[pk.from] + (nx[pk.to] - nx[pk.from]) * pk.t;
            const y = ny[pk.from] + (ny[pk.to] - ny[pk.from]) * pk.t;
            ctx.drawImage(packetSprite, x - 9, y - 9, 18, 18);
          }
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = HEAD;
        ctx.beginPath();
        for (const pk of packets) {
          const x = nx[pk.from] + (nx[pk.to] - nx[pk.from]) * pk.t;
          const y = ny[pk.from] + (ny[pk.to] - ny[pk.from]) * pk.t;
          ctx.moveTo(x + 2.2, y);
          ctx.arc(x, y, 2.2, 0, TAU);
        }
        ctx.fill();
      }

      // ── Tap / click ripples ──
      for (const rp of ripples) {
        ctx.globalAlpha = rp.life * 0.6;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      updateHud(progress);
    };

    const step = (time: number) => {
      frame = 0;
      if (document.hidden) return;
      frame = requestAnimationFrame(step);

      // Adaptive quality: if a desktop can't keep up, drop to ~30 fps.
      if (lastTime && !lite && budget === 0) {
        sampledFrames++;
        if (time - lastTime > 24) slowFrames++;
        if (sampledFrames >= 90) {
          if (slowFrames > 45) budget = 33;
          sampledFrames = 0;
          slowFrames = 0;
        }
      }
      lastTime = time;
      if (budget && time - lastDraw < budget - 2) return;
      const dt = Math.min(64, lastDraw ? time - lastDraw : 16.7);
      lastDraw = time;
      const k = dt / 16.7;

      // Frame-rate independent easing toward the scroll-driven targets.
      progress += (target - progress) * (1 - Math.pow(1 - 0.06, k));
      smoothScroll += (window.scrollY - smoothScroll) * (1 - Math.pow(1 - (gentle ? 0.05 : 0.1), k));
      scrollBoost *= Math.pow(0.9, k);
      if (pointer.active && pointer.touchUntil && time > pointer.touchUntil) {
        pointer.active = false;
        pointer.touchUntil = 0;
      }

      // A few erratic packets even in chaos; the full flow once ordered.
      const wanted = Math.floor(3 + easeInOut(progress) * (maxPackets - 3));
      if (packets.length < wanted && Math.random() < 0.3) spawnPacket();
      let keep = 0;
      for (let i = 0; i < packets.length; i++) {
        const pk = packets[i];
        pk.t += pk.speed * speed * k * (1 + scrollBoost * 0.08);
        if (pk.t >= 1) {
          // Arrived: continue to a random next neighbour (no immediate U-turn).
          if (packets.length > wanted + 6) continue;
          const to = pickNext(pk.to, pk.from);
          if (to < 0) continue;
          pk.from = pk.to;
          pk.to = to;
          pk.t = 0;
        }
        packets[keep++] = pk;
      }
      packets.length = keep;

      keep = 0;
      for (let i = 0; i < ripples.length; i++) {
        const rp = ripples[i];
        rp.r += 6 * k;
        rp.life -= 0.022 * k;
        if (rp.life <= 0) continue;
        for (let n = 0; n < count; n++) {
          const dx = nx[n] - rp.x;
          const dy = ny[n] - rp.y;
          if (Math.abs(Math.sqrt(dx * dx + dy * dy) - rp.r) < 10 && rp.life > glow[n]) glow[n] = rp.life;
        }
        ripples[keep++] = rp;
      }
      ripples.length = keep;

      draw(time);
    };

    const start = () => {
      if (animate && !frame && !document.hidden) {
        lastTime = 0;
        lastDraw = 0;
        frame = requestAnimationFrame(step);
      }
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
      smoothScroll = 0;
      draw(0);
    }

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        // Phones resize on every URL-bar show/hide; the canvas is CSS-sized,
        // so small height-only changes don't need a full rebuild.
        if (window.innerWidth === width && Math.abs(window.innerHeight - height) < 160) return;
        build();
        if (!animate) draw(0);
      }, 150);
    };
    const onScroll = () => computeTarget();
    const onPointerMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
      pointer.touchUntil = e.pointerType === "mouse" ? 0 : performance.now() + 900;
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };
    const onPointerDown = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
      pointer.touchUntil = e.pointerType === "mouse" ? 0 : performance.now() + 900;
      if (!gentle) ripples.push({ x: e.clientX, y: e.clientY, r: 4, life: 1 });
      const origin = nearestNode(e.clientX, e.clientY);
      for (let i = 0; i < 4; i++) spawnPacket(origin);
    };
    const onPointerCancel = (e: PointerEvent) => {
      // Touch scrolls cancel the pointer: let the glow fade out on its own.
      if (e.pointerType !== "mouse") pointer.touchUntil = performance.now() + 400;
    };
    const onVisibility = () => start();

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    if (animate) {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerdown", onPointerDown, { passive: true });
      window.addEventListener("pointerup", onPointerCancel, { passive: true });
      window.addEventListener("pointercancel", onPointerCancel, { passive: true });
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
    }

    return () => {
      cancelAnimationFrame(frame);
      frame = 0;
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerCancel);
      window.removeEventListener("pointercancel", onPointerCancel);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [isStaticRoute]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="imt-canvas pointer-events-none fixed inset-0 z-0 size-full [mask-image:radial-gradient(ellipse_90%_85%_at_50%_45%,#000_45%,transparent_100%)]"
      />
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
          <span ref={labelRef} className="tabular-nums">
            0% · OPERAR
          </span>
        </div>
      )}
    </>
  );
}
