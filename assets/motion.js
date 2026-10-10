// Smooth scrolling (Lenis) and the clock GSAP's scroll animations run on.
// Loads before site.js. Phones keep native touch scrolling; reduced motion turns it off.
(function () {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || typeof window.Lenis !== 'function') return;

  const lenis = new window.Lenis({
    lerp: 0.12,             // how quickly it catches up to the wheel: low enough to glide, high enough not to feel floaty
    wheelMultiplier: 0.95,
  });
  window.siteLenis = lenis;

  // In-page links glide to the section and stop just below the nav (like scroll-padding-top does natively).
  // Measured from the layout, not the screen, so sections still sliding in with their reveal don't throw it off.
  const layoutTop = (el) => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    const target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(Math.max(0, layoutTop(target) - 96), { duration: 1.1 });
    history.pushState(null, '', '#' + id);
    if (id === 'main') target.focus?.({ preventScroll: true });
  });

  if (window.gsap && window.ScrollTrigger) {
    // One clock for both, so scroll-linked animations never lag a frame behind the scroll
    window.gsap.registerPlugin(window.ScrollTrigger);
    lenis.on('scroll', window.ScrollTrigger.update);
    window.gsap.ticker.add((time) => lenis.raf(time * 1000));
    window.gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
})();
