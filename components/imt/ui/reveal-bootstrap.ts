/**
 * Inline bootstrap for the scroll reveal. Arms the reveal CSS (`.imt-js`)
 * before first paint; if RevealObserver never hydrates (JS error, blocked
 * bundle) it disarms after 3 s so content is never left invisible.
 * Plain module (not "use client") so the root layout can import the string.
 */
export const REVEAL_BOOTSTRAP = `(function(){var d=document.documentElement;d.classList.add('imt-js');setTimeout(function(){if(!d.hasAttribute('data-reveal-ready'))d.classList.remove('imt-js')},3000)})();`;
