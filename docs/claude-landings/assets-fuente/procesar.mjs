// Convierte los masters de Magnific (y la foto real del instructor) en los assets web de las landings.
// Uso (desde la raiz del repo):  node docs/claude-landings/assets-fuente/procesar.mjs
// Requiere sharp (ya en node_modules) y ffmpeg en el PATH. Los masters NO se publican: solo salen los derivados.
//
// Masters en docs/claude-landings/assets-fuente/magnific/ (ver 04-manifiesto-de-assets.md):
//   kling_alpha.webm  video SIN fondo (VP9 con alfa) generado con Kling 2.5 a partir de img_B.png y recortado con Magnific
//   instructor: public/assets/images/section/alexander-foto.jpg (foto real ya publicada en el sitio)
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";

const M = "docs/claude-landings/assets-fuente/magnific";
const OUT = "public/comunidad/landing";
mkdirSync(OUT, { recursive: true });

// Recorte comun a todos los fotogramas (la caja del sujeto es constante en todo el video) y escala de uso.
const RECORTE = "crop=1560:800:180:150,scale=1170:600:flags=lanczos";

// 1) Video con alfa para la web: GOP corto (g=8) para que el scrub con scroll sea fluido; sin audio.
execFileSync(
  "ffmpeg",
  ["-y", "-v", "error", "-c:v", "libvpx-vp9", "-i", `${M}/kling_alpha.webm`, "-vf", `${RECORTE},format=yuva420p`,
   "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-auto-alt-ref", "0", "-crf", "34", "-b:v", "0", "-g", "8",
   "-deadline", "good", "-cpu-used", "2", "-row-mt", "1", "-r", "24", "-an", `${OUT}/escena.webm`],
  { stdio: "inherit" },
);

// 2) Poster = ultimo fotograma (mismo encuadre), con alfa.
execFileSync(
  "ffmpeg",
  ["-y", "-v", "error", "-c:v", "libvpx-vp9", "-sseof", "-0.15", "-i", `${M}/kling_alpha.webm`, "-vf", RECORTE,
   "-frames:v", "1", "-update", "1", `${M}/poster_final.png`],
  { stdio: "inherit" },
);
const poster = await sharp(`${M}/poster_final.png`).png().toBuffer();
await sharp(poster).avif({ quality: 55, effort: 6 }).toFile(`${OUT}/escena-poster.avif`);
await sharp(poster).webp({ quality: 82, alphaQuality: 95, effort: 6 }).toFile(`${OUT}/escena-poster.webp`);

// 3) Instructor (foto real).
const foto = await sharp("public/assets/images/section/alexander-foto.jpg")
  .resize(640, 800, { fit: "cover", position: "attention" })
  .png()
  .toBuffer();
await sharp(foto).avif({ quality: 52, effort: 6 }).toFile(`${OUT}/instructor.avif`);
await sharp(foto).webp({ quality: 80, effort: 6 }).toFile(`${OUT}/instructor.webp`);

for (const f of ["escena.webm", "escena-poster.avif", "escena-poster.webp", "instructor.avif", "instructor.webp"]) {
  console.log(f.padEnd(22), `${(statSync(`${OUT}/${f}`).size / 1024).toFixed(0)} KB`);
}
