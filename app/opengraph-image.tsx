import { ImageResponse } from "next/og";
import { site } from "@/content/site";

export const runtime = "edge";
export const alt = "IA Master Tech — OPERAR vs. ESCALAR";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#05080D";
const LINE = "#10263A";
const CYAN = "#22D3EE";
const TEXT = "#F1F5F9";
const MUTED = "#94A3B8";

// Circuit traces drawn as solid 2px bars (no stacked translucent gradients).
const TRACES: { left: number; top: number; width: number; height: number }[] = [
  { left: 0, top: 120, width: 520, height: 2 },
  { left: 518, top: 120, width: 2, height: 140 },
  { left: 518, top: 258, width: 682, height: 2 },
  { left: 760, top: 0, width: 2, height: 260 },
  { left: 900, top: 258, width: 2, height: 372 },
  { left: 0, top: 520, width: 900, height: 2 },
  { left: 1040, top: 80, width: 160, height: 2 },
  { left: 1040, top: 80, width: 2, height: 180 },
];

const NODES = [
  { left: 513, top: 115 },
  { left: 755, top: 253 },
  { left: 895, top: 515 },
  { left: 1035, top: 75 },
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: BG,
          fontFamily: "sans-serif",
        }}
      >
        {TRACES.map((t, i) => (
          <div
            key={`t${i}`}
            style={{ position: "absolute", left: t.left, top: t.top, width: t.width, height: t.height, backgroundColor: LINE }}
          />
        ))}
        {NODES.map((n, i) => (
          <div
            key={`n${i}`}
            style={{
              position: "absolute",
              left: n.left,
              top: n.top,
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: CYAN,
            }}
          />
        ))}
        {/* Single translucent layer over a solid background. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            backgroundImage: "radial-gradient(circle at 78% 40%, rgba(34,211,238,0.22), rgba(5,8,13,0) 55%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "72px 80px",
          }}
        >
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 6, color: CYAN }}>
            ALEXANDER CAST PRESENTA · IA MASTER TECH
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "baseline", fontSize: 124, fontWeight: 800, lineHeight: 1, letterSpacing: -4 }}>
              <span style={{ color: TEXT }}>OPERAR</span>
              <span style={{ color: MUTED, fontSize: 64, margin: "0 28px", fontWeight: 600 }}>vs.</span>
              <span style={{ color: CYAN }}>ESCALAR</span>
            </div>
            <div style={{ display: "flex", marginTop: 28, fontSize: 32, color: TEXT, maxWidth: 900, lineHeight: 1.3 }}>
              Desarrollo y automatización para empresas que ya venden.
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: MUTED }}>
            <span>Una entrega funcionando cada semana</span>
            <span style={{ color: TEXT }}>{site.handle}</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
