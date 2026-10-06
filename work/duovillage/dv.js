// DuoVillage: scroll-driven phone flow and counting stats.
(function () {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Phone flow: one screen and caption per step
  const story = document.querySelector('.flowstory');
  if (story) {
    const screens = [...story.querySelectorAll('.screen img')];
    const caps = [...story.querySelectorAll('.flow-caps > div')];
    const label = story.querySelector('.chapter-label span');
    const count = story.querySelector('.count');
    const bar = story.querySelector('.flow-bar i');
    const n = screens.length;
    let current = -1;

    function show(i) {
      if (i === current) return;
      current = i;
      screens.forEach((s, j) => { s.classList.toggle('on', j === i); s.classList.toggle('past', j < i); });
      caps.forEach((c, j) => c.classList.toggle('on', j === i));
      if (label) label.textContent = caps[i].dataset.chapter || '';
      if (count) count.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
    }

    if (reduced) {
      story.classList.add('static');
      show(0);
    } else {
      const update = () => {
        const r = story.getBoundingClientRect();
        const p = Math.min(Math.max(-r.top / Math.max(r.height - innerHeight, 1), 0), 1);
        show(Math.min(n - 1, Math.floor(p * n)));
        if (bar) bar.style.width = (p * 100).toFixed(1) + '%';
      };
      addEventListener('scroll', update, { passive: true });
      addEventListener('resize', update);
      update();
    }
  }

  // Count up the survey numbers when they appear
  const nums = [...document.querySelectorAll('[data-count]')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        const el = en.target;
        const target = Number(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        if (reduced) { el.textContent = target + suffix; return; }
        const t0 = performance.now();
        const tick = (now) => {
          const t = Math.min((now - t0) / 1200, 1);
          el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))) + suffix;
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    nums.forEach((el) => io.observe(el));
  }
})();
