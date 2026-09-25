/**
 * Inline bootstrap for the scroll reveal. Arms the reveal CSS (`.imt-js`)
 * before first paint; if RevealObserver has not hydrated after 2.5 s (JS
 * error, blocked or very slow bundle) it disarms, so content is never left
 * invisible. It also disarms when the page is restored from the bfcache
 * without JS having run. Plain module (not "use client") so the root layout
 * can import the string.
 */
export const REVEAL_BOOTSTRAP = `(function(){var d=document.documentElement;d.classList.add('imt-js');function off(){if(!d.hasAttribute('data-reveal-ready'))d.classList.remove('imt-js')}setTimeout(off,2500);window.addEventListener('pageshow',function(e){if(e.persisted)off()})})();`;
