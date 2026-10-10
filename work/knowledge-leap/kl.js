// Knowledge Leap story: sky descent, stars, play videos only while visible, click-to-load film.
(function () {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Twinkling stars over the top of the sky
  const stars = document.querySelector('.stars');
  if (stars && !reduced) {
    for (let i = 0; i < 70; i++) {
      const s = document.createElement('i');
      s.style.left = Math.random() * 100 + '%';
      s.style.top = Math.random() * 55 + '%';
      s.style.setProperty('--d', (2.5 + Math.random() * 4).toFixed(2) + 's');
      s.style.setProperty('--delay', (Math.random() * 4).toFixed(2) + 's');
      stars.appendChild(s);
    }
  }

  // Descend through the sky as the page scrolls
  if (!reduced) {
    let ticking = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      root.style.setProperty('--descent', Math.min(scrollY / Math.max(max, 1), 1).toFixed(4));
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  // Pinned story: start inside the TV on the city, pull back into the room,
  // switch the TV to three panels, push back into the screen, then slide between panels.
  const story = document.querySelector('.story');
  if (story) {
    const card = story.querySelector('.story-card');
    const room = story.querySelector('.room');
    const city = story.querySelector('.tv .city');
    const panels = [...story.querySelectorAll('.tv .panel')];
    const caps = [...story.querySelectorAll('.cap')];
    const dots = [...story.querySelectorAll('.dots li')];
    const ZOOM = 100 / 25.5; // TV is 25.5% of the card's width
    // Draw the room at its fully zoomed-in size and shrink it to pull back. Scaling a small
    // layer up makes the browser stretch a low-resolution copy, which is what looked pixelated.
    Object.assign(room.style, {
      inset: 'auto', left: (50.45 * (1 - ZOOM)).toFixed(3) + '%', top: (35.5 * (1 - ZOOM)).toFixed(3) + '%',
      width: (100 * ZOOM).toFixed(3) + '%', height: (100 * ZOOM).toFixed(3) + '%',
    });
    // Fade the story in once its images are decoded, so nothing shows half-loaded
    const imgs = [...story.querySelectorAll('.room img')];
    card.classList.add('waiting');
    Promise.all(imgs.map((i) => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()))).then(() => card.classList.remove('waiting'));
    const clamp = (v) => Math.min(Math.max(v, 0), 1);
    const seg = (p, a, b) => clamp((p - a) / (b - a));
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    function render(z, triIn, t, kf, step) {
      const s = (1 + (ZOOM - 1) * z) / ZOOM;
      room.style.transform = `translate(${((50 - 50.45) * z / ZOOM).toFixed(4)}%, ${((50 - 35.5) * z / ZOOM).toFixed(4)}%) scale(${s.toFixed(5)})`;
      city.style.opacity = String(1 - triIn);
      panels.forEach((el, j) => {
        const left = (1 - t) * j * 33.333 + t * (j - kf) * 100;
        el.style.left = left.toFixed(3) + '%';
        el.style.width = (33.333 + (100 - 33.333) * t).toFixed(3) + '%';
        el.style.opacity = String(triIn);
        el.classList.toggle('scanning', step === 4);
      });
      caps.forEach((c, i) => c.classList.toggle('on', i === step));
      dots.forEach((d, i) => d.classList.toggle('on', i === step));
      card.classList.toggle('inside', step >= 2);
    }

    if (reduced) {
      story.classList.add('static');
      render(0, 1, 0, 0, -1);
      caps.forEach((c) => c.classList.add('on'));
    } else {
      const at = (p) => {
        const z = p < 0.10 ? 1 : p < 0.26 ? 1 - ease(seg(p, 0.10, 0.26)) : p < 0.40 ? 0 : ease(seg(p, 0.40, 0.56));
        const triIn = seg(p, 0.26, 0.34);
        const t = ease(seg(p, 0.40, 0.56));
        const kf = ease(seg(p, 0.62, 0.72)) + ease(seg(p, 0.78, 0.88));
        const step = p < 0.22 ? 0 : p < 0.47 ? 1 : p < 0.66 ? 2 : p < 0.82 ? 3 : 4;
        render(z, triIn, t, kf, step);
      };
      if (window.gsap && window.ScrollTrigger) {
        // GSAP follows the scroll position with a short catch-up (scrub), so the zoom and slides
        // stay smooth even when the wheel or trackpad sends uneven jumps
        window.gsap.registerPlugin(window.ScrollTrigger);
        const state = { p: 0 };
        window.gsap.to(state, {
          p: 1, ease: 'none', onUpdate: () => at(state.p),
          scrollTrigger: { trigger: story, start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true },
        });
        at(0);
      } else {
        const update = () => {
          const r = story.getBoundingClientRect();
          at(clamp(-r.top / Math.max(r.height - innerHeight, 1)));
        };
        addEventListener('scroll', update, { passive: true });
        addEventListener('resize', update);
        update();
      }
    }
  }

  // Lens videos: play while on screen, pause otherwise
  const videos = [...document.querySelectorAll('.viewport video')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const v = en.target;
        if (en.isIntersecting && !reduced) v.play().catch(() => {});
        else v.pause();
      });
    }, { threshold: 0.35 });
    videos.forEach((v) => io.observe(v));
  }

  // Concept film loads YouTube only when asked
  document.querySelectorAll('.film[data-yt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.yt;
      const f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      f.title = btn.getAttribute('aria-label') || 'Video';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      btn.replaceChildren(f);
      btn.style.cursor = 'default';
    }, { once: true });
  });
})();
