// Site behaviours: preloader, windows, reveals, tablet tilt (cards and hero), filters, copy email, menu, section highlight.
(function () {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Preloader, then landing entrance ----------
  const pre = $('.preloader');
  function start() {
    root.classList.add('ready');
    if (pre) {
      pre.classList.add('done');
      setTimeout(() => pre.remove(), 700);
    }
  }
  let seen = false;
  try { seen = sessionStorage.getItem('ai-seen') === '1'; sessionStorage.setItem('ai-seen', '1'); } catch (e) {}
  if (/[?&]intro\b/.test(location.search)) seen = false; // add ?intro to the URL to replay the preloader
  if (!pre || seen || reduced) {
    pre?.remove();
    root.classList.add('ready');
  } else {
    const minShow = new Promise((r) => setTimeout(r, 1000));
    const loaded = new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })));
    Promise.race([Promise.all([minShow, loaded]), new Promise((r) => setTimeout(r, 2200))]).then(start);
  }

  // ---------- Toast ----------
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  document.body.appendChild(toast);
  let toastTimer;
  function notify(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  // ---------- Windows: one round button collapses to the title bar ----------
  $$('.win[data-win]').forEach((win) => {
    const btn = $('.xbtn', win);
    const body = $('.win-body', win);
    const title = ($('.win-bar h2, .win-bar .title', win)?.textContent || 'window').trim();
    if (!btn || !body) return;
    function set(collapsed) {
      win.classList.toggle('collapsed', collapsed);
      btn.setAttribute('aria-expanded', String(!collapsed));
      btn.setAttribute('aria-label', (collapsed ? 'Expand ' : 'Collapse ') + title);
      body.inert = collapsed;
    }
    set(win.classList.contains('collapsed'));
    btn.addEventListener('click', () => set(!win.classList.contains('collapsed')));
  });

  // ---------- Scroll reveal ----------
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  // ---------- Work cards: the tablet tilts toward the cursor ----------
  if (!reduced && matchMedia('(hover: hover)').matches) {
    $$('.card').forEach((card) => {
      const tab = $('.monitor', card);
      if (!tab) return;
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        tab.classList.add('tilting');
        tab.style.setProperty('--ry', (x * 18).toFixed(2) + 'deg');
        tab.style.setProperty('--rx', (-y * 14).toFixed(2) + 'deg');
        tab.style.setProperty('--gx', (50 + x * 70).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', () => {
        tab.classList.remove('tilting');
        tab.style.setProperty('--rx', '0deg');
        tab.style.setProperty('--ry', '0deg');
        tab.style.setProperty('--gx', '50%');
      });
    });
  }

  // ---------- Home hero: the featured tablet leans toward the cursor anywhere in the hero ----------
  const heroTab = $('.hero-work .monitor');
  const hero = $('.landing');
  if (heroTab && hero && !reduced && matchMedia('(hover: hover)').matches) {
    hero.addEventListener('pointermove', (e) => {
      const r = heroTab.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 0.9)));
      const y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 1.4)));
      heroTab.classList.add('tilting');
      heroTab.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
      heroTab.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
      heroTab.style.setProperty('--gx', (50 + x * 35).toFixed(1) + '%');
    });
    hero.addEventListener('pointerleave', () => {
      heroTab.classList.remove('tilting');
      ['--rx', '--ry'].forEach((v) => heroTab.style.setProperty(v, '0deg'));
      heroTab.style.setProperty('--gx', '50%');
    });
  }

  // ---------- Case studies: "On this page" starts beside the hero, then sticks as you scroll ----------
  const toc = $('.toc'), heroTop = $('.landing.short .crumbs');
  if (toc && heroTop) {
    const lift = () => {
      toc.style.setProperty('--toc-lift', '0px');
      const d = toc.getBoundingClientRect().top - heroTop.getBoundingClientRect().top;
      toc.style.setProperty('--toc-lift', Math.max(0, d) + 'px');
    };
    lift();
    addEventListener('resize', lift);
    addEventListener('load', lift);
  }

  // ---------- Phones: the tablets lean with the device's motion, like they do with the cursor ----------
  const tablets = $$('.monitor');
  if (tablets.length && !reduced && matchMedia('(hover: none)').matches && 'DeviceOrientationEvent' in window) {
    let rest = null, tx = 0, ty = 0, cx = 0, cy = 0, running = false;
    const step = () => {
      cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;
      tablets.forEach((t) => {
        t.style.setProperty('--ry', (cx * 14).toFixed(2) + 'deg');
        t.style.setProperty('--rx', (-cy * 10).toFixed(2) + 'deg');
        t.style.setProperty('--gx', (50 + cx * 45).toFixed(1) + '%');
      });
      if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) requestAnimationFrame(step); else running = false;
    };
    const onTilt = (e) => {
      if (e.beta == null || e.gamma == null) return;
      // in landscape the axes swap
      const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
      let lr = e.gamma, fb = e.beta;
      if (angle === 90) { lr = e.beta; fb = -e.gamma; } else if (angle === -90 || angle === 270) { lr = -e.beta; fb = e.gamma; }
      if (!rest) { rest = { lr, fb }; tablets.forEach((t) => t.classList.add('tilting')); }
      // measured against however the phone is being held, slowly re-centring
      rest.lr += (lr - rest.lr) * 0.01; rest.fb += (fb - rest.fb) * 0.01;
      tx = Math.max(-1, Math.min(1, (lr - rest.lr) / 22));
      ty = Math.max(-1, Math.min(1, (fb - rest.fb) / 22));
      if (!running) { running = true; requestAnimationFrame(step); }
    };
    // Listen straight away (Android); iOS only sends motion once allowed, so ask on the first tap
    addEventListener('deviceorientation', onTilt);
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      addEventListener('touchend', () => { DeviceOrientationEvent.requestPermission().catch(() => {}); }, { once: true });
    }
  }

  // ---------- Copy email ----------
  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      // On touch devices the top-bar button opens the mail app; with a mouse it copies (even in a narrow window)
      if (btn.matches('a[href^="mailto:"]') && matchMedia('(hover: none)').matches) return;
      e.preventDefault();
      const value = btn.getAttribute('data-copy');
      try {
        await navigator.clipboard.writeText(value);
        notify('Email copied: ' + value);
      } catch (e) {
        location.href = 'mailto:' + value;
      }
    });
  });

  // ---------- Mobile menu ----------
  const toggle = $('.menu-toggle');
  const sheet = $('.sheet');
  function setSheet(open) {
    if (!toggle || !sheet || open === sheet.classList.contains('open')) return;
    // Where the third line sits, relative to the pane: the pane grows out of it and folds back into it
    const t = toggle.getBoundingClientRect();
    const box = sheet.getBoundingClientRect();
    sheet.style.setProperty('--ly', (t.top + 27 - box.top).toFixed(1) + 'px');
    sheet.style.setProperty('--lr', (box.right - (t.left + 33)).toFixed(1) + 'px');
    sheet.style.setProperty('--lw', '22px');
    sheet.classList.remove('closing');
    sheet.classList.toggle('open', open);
    if (!open && !reduced) {
      sheet.classList.add('closing');
      sheet.addEventListener('animationend', function done(e) {
        if (e.target !== sheet) return;
        sheet.classList.remove('closing');
        sheet.removeEventListener('animationend', done);
      });
    }
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  toggle?.addEventListener('click', () => setSheet(!sheet.classList.contains('open')));
  $$('.sheet a').forEach((a) => a.addEventListener('click', () => setSheet(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setSheet(false); });
  document.addEventListener('click', (e) => {
    if (sheet?.classList.contains('open') && !e.target.closest('.topbar')) setSheet(false);
  });

  // ---------- Work filters ----------
  const tabs = $$('[role="tab"][data-filter]');
  const cards = $$('[data-tags]');
  tabs.forEach((tab) => {
    const f = tab.dataset.filter;
    const n = f === 'all' ? cards.length : cards.filter((c) => c.dataset.tags.split(' ').includes(f)).length;
    const count = $('.n', tab);
    if (count) count.textContent = n;
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.setAttribute('aria-selected', String(t === tab));
        t.tabIndex = t === tab ? 0 : -1;
      });
      cards.forEach((c) => { c.hidden = !(f === 'all' || c.dataset.tags.split(' ').includes(f)); });
    });
  });
  $('[role="tablist"]')?.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    next.focus();
    next.click();
  });

  // ---------- Highlight the section in view ----------
  const spyLinks = $$('[data-spy] a[href^="#"]');
  const targets = spyLinks.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  if (targets.length && 'IntersectionObserver' in window) {
    const visible = new Map();
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => visible.set(en.target.id, en.isIntersecting));
      const current = targets.find((t) => visible.get(t.id));
      if (!current) return;
      spyLinks.forEach((a) => {
        const on = a.getAttribute('href') === '#' + current.id;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      });
    }, { rootMargin: '-90px 0px -55% 0px' });
    targets.forEach((t) => spy.observe(t));
  }

  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();

// Click-to-load live embeds
document.querySelectorAll('.live-embed[data-src]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = btn.dataset.src;
    f.title = btn.getAttribute('aria-label') || 'Interactive module';
    f.loading = 'lazy';
    btn.replaceChildren(f);
    btn.style.cursor = 'default';
  }, { once: true });
});

// Resume buttons only show once resume.pdf has been uploaded next to index.html
(function () {
  const links = document.querySelectorAll('[data-resume]');
  if (!links.length) return;
  links.forEach((a) => { a.hidden = true; });
  fetch('resume.pdf', { method: 'HEAD', cache: 'no-store' })
    .then((r) => { if (r.ok) links.forEach((a) => { a.hidden = false; }); })
    .catch(() => {});
})();
