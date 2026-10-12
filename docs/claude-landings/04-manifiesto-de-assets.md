# 04 · Manifiesto de assets

Cambio de rumbo (decisión del usuario): el primer enfoque, renders 3D hechos en Blender, **se descartó** («no me gustaron las imágenes del
3D»). Los visuales ahora salen de **Magnific**: imagen generada → animada en video → recortada **sin fondo** para fundirse con la página.
El prototipo de Blender se eliminó del repositorio y no se usa en ninguna página.

Pipeline: `assets-fuente/procesar.mjs` (ffmpeg + sharp) → `public/comunidad/landing/`.
Master conservado en el repo: `assets-fuente/magnific/kling_alpha.webm` (WebM VP9 con alfa, 1920×1080, 10 s). Las demás fuentes viven en la cuenta
de Magnific del usuario (creaciones citadas abajo) y en la carpeta local ignorada por git.

## Generación (todas con Magnific; créditos reales de la cuenta, plan Premium+, sin modo ilimitado en esta sesión)

| Paso | Herramienta / modelo | Parámetros | Créditos |
|---|---|---|---|
| 1. Imagen base (2 candidatos, se eligió el B) | `images_generate` · Seedream 5 Pro | 16:9, 2k, 2 variantes | 200 |
| 2. Poster sin fondo (prueba de recorte) | `images_remove_background` | sobre el candidato B | 3 |
| 3. Animación | `video_generate` · Kling 2.5 | 10 s, 1080p, 16:9, fotograma inicial = final = candidato B (la escena sale y vuelve a su sitio) | 650 |
| 4. Recorte del fondo del video | `video_remove_background` · General Use (Heavy) | refineForeground, calidad alta, VP9 `.webm` con alfa | 110 |
| **Total** | | | **963** de 7.607 disponibles |

Prompt de la imagen (resumen): tres módulos físicos —ventana de navegador, app tipo teléfono y calculadora— en cerámica marfil vidriada y grafito mate,
unidos por una línea lima luminosa sobre un plinto grafito; vista tres cuartos, fondo gris liso, sin texto ni logos ni interfaz legible.
Prompt del video (resumen): cámara fija; los módulos se elevan y giran en vista despiezada mientras un pulso lima recorre las conexiones y enciende cada botón; luego
vuelven exactamente a su posición. Sin texto ni objetos nuevos.

## Publicados (`public/comunidad/landing/`)

| Rol | Archivo | Fuente | Dimensiones | Peso | Notas |
|---|---|---|---|---|---|
| Escena animada sin fondo | `escena.webm` | `kling_alpha.webm` recortado a la caja del sujeto | 1170×600, 24 fps, 10 s | ≈1,8 MB | VP9 con alfa; GOP de 8 fotogramas para el scrub; se carga diferido |
| Poster sin fondo (LCP) | `escena-poster.avif` / `.webp` | último fotograma del video | 1170×600 | ≈20 KB / 40 KB | único recurso prioritario de la página |
| Instructor | `instructor.avif` / `.webp` | foto real del sitio (`public/assets/images/section/alexander-foto.jpg`) | 640×800 | ≈11 KB / 16 KB | no es generada |

Estado: final. Variante: ambas landings. No hay masters de producción en la web: solo estos derivados.

## Reglas de uso y límites

- La escena es **ilustrativa**: no muestra resultados de alumnos ni interfaz real; todo texto, precio y CTA es HTML.
- Safari no lee el canal alfa de WebM VP9 de forma fiable: ahí (y con «reducir movimiento» o «ahorro de datos») la escena es el poster estático y la historia se
  muestra apilada. Mejora pendiente si Safari importa: un `.mov` HEVC con alfa (ffmpeg no lo codifica en Windows; requiere macOS/VideoToolbox).
- Peso: el video (≈1,8 MB) supera el presupuesto de trabajo de imágenes iniciales porque **no es inicial**: se descarga después del primer pintado, o al acercarse a
  la sección de historia. El presupuesto inicial lo cumple el poster (≈20 KB AVIF).
- Derechos: imágenes y video generados con la suscripción del usuario en Magnific (consultar sus términos de uso comercial antes de campañas masivas). La foto del
  instructor es material propio de Alexander ya publicado en el sitio. Sin assets de terceros.
- Comparar siempre con el master antes de reemplazar: se rechaza cualquier deformación de geometría, texto añadido o cambio de color de marca.

## Descartado

- Blender (escena, animación por script y renders): eliminado. Magnific para «acabado/upscale» de esos renders: no se usó.
- Candidato A de la imagen (módulos más pequeños y cables más largos): se descartó por claridad.
