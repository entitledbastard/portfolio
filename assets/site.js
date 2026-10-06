// Site behaviours: preloader, windows, reveals, card tilt, filters, copy email, menu, section highlight.
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

  // ---------- Card tilt toward the cursor ----------
  if (!reduced && matchMedia('(hover: hover)').matches) {
    $$('.card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.classList.add('tilting');
        card.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg');
        card.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg');
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  // ---------- Copy email ----------
  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
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
    if (!toggle || !sheet) return;
    sheet.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
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
