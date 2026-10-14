# 03 · Kit, skills y herramientas: qué se usó y qué no

## Kit `Hainrixz-claude-webkit` (`D:/Github/06-tools/_terceros/`)

Leído: `README.md`, `CLAUDE.md` y los `SKILL.md` relevantes. **No** se ejecutó su scaffolding, no se generó `site/`, no se copió su
`CLAUDE.md` ni se usó su deploy. Skills disponibles en el kit: animate, animation-vocabulary, apple-design, building-components,
chrome-bridge-automation, deep-research, emil-design-eng, frontend-design, humanizer, playwright-cli, prototype, seo-audit,
shadcn-ui, ui-ux-pro-max, vercel-deploy, vercel-react-best-practices, web-design-guidelines, web-reader (entre otras).

| Skill | Dónde | Qué aportó | Resultado concreto |
|---|---|---|---|
| `frontend-design` (kit; Apache 2.0, ver su NOTICE) | kit | Obligar a una dirección clara y un elemento memorable | Concepto «de una idea a un sistema» y la escena 3D como único elemento memorable; sin degradados morados ni tarjetas idénticas |
| `page-cro` | `~/.agents/skills` | Orden de diagnóstico y *no prometer lifts* | Lista de comprobación heurística sin puntuación inventada (01-brief) |
| `ads-landing` | `~/.agents/skills` | Message match, móvil, peso de página | Presupuesto de imágenes, CTA fijo móvil, nota de message match pendiente |
| `signup-flow-cro` / `form-cro` | `~/.agents/skills` | Reducir campos, valor antes del compromiso, expectativas claras | Se reutiliza el registro existente (sin más campos) y se muestra qué pasa tras el clic |
| `humanizer` / copywriting | kit / `~/.agents/skills` | Español natural | Pasada sobre el copy: frases cortas, sin hype |
| `vercel-react-best-practices` | kit | Imágenes/carga | `<picture>` AVIF/WebP con dimensiones, `fetchPriority` solo en el hero, `loading=lazy` bajo el pliegue, vídeo diferido |
| `building-components` / `shadcn-ui` / `web-design-guidelines` | kit | Accesibilidad e implementación | Se inspeccionó el repo: el módulo usa CSS propio (`mia-*`) y no shadcn; se extendió ese sistema en vez de importar otro |
| `ab-test-setup` | `~/.agents/skills` | Disciplina de experimentos | Solo plan, sin ganador (05-medición): no hay volumen |

Decisiones de reutilización: no se copió código del kit. Se conservó **Inter / Space Grotesk / JetBrains Mono** de la identidad
existente (la skill genérica sugeriría otras tipografías; prevalece la identidad del módulo). `BRAND-CONTEXT.md` se usó como contexto
corporativo, **no** se trasladó su negro/dorado: el módulo es marfil + lima.

## Herramientas de generación y QA

| Herramienta | Disponibilidad | Uso real |
|---|---|---|
| Magnific (MCP): Seedream 5 Pro, Kling 2.5, recorte de fondo de imagen y de video | Disponible (Premium+, 7.607 créditos; el modo ilimitado no aplica a la sesión) | **Usado**: imagen base, animación y recorte sin fondo; 963 créditos (detalle en `04`). El coste se simuló antes y el usuario lo pidió expresamente |
| Blender 5.2 (CLI) | Instalado | Se probó una primera versión por script; **descartada** por decisión del usuario y eliminada del repo |
| ffmpeg 9 | Instalado | **Usado** para recortar/codificar el WebM con alfa y extraer el poster |
| sharp | En `node_modules` | **Usado** para AVIF/WebP |
| Navegador (Claude Browser) | Disponible | Usado para QA visual y de scroll (ver `06`) |

No se contrató ningún plan ni se superó el presupuesto de créditos acordado en la sesión.
