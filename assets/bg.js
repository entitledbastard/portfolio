// 3D "desktop" background: a ringed planet, Saturn-style, lit in Ahmad's sunset and eccentric gradients.
// Loads Three.js after the page is ready, pauses in background tabs, and stays a still CSS gradient
// when reduced motion is on or WebGL isn't available.
(function () {
  const host = document.querySelector('.backdrop');
  if (!host) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const test = document.createElement('canvas');
  if (!(test.getContext('webgl') || test.getContext('experimental-webgl'))) return;

  const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

  function load() {
    const s = document.createElement('script');
    s.src = THREE_URL;
    s.async = true;
    s.onload = init;
    document.head.appendChild(s);
  }
  const later = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
  if (document.readyState === 'complete') later(load);
  else addEventListener('load', () => later(load), { once: true });

  // Planet: smooth sphere with soft latitude bands, a lit side, a dark side and an atmospheric rim
  const planetVert = `
    varying vec3 vObj;
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
      vObj = normalize(position);
      vNormal = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vView = -mv.xyz;
      gl_Position = projectionMatrix * mv;
    }`;

  const planetFrag = `
    uniform vec3 cAmber;
    uniform vec3 cMagenta;
    uniform vec3 cIndigo;
    uniform float uBands;
    varying vec3 vObj;
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
      vec3 N = normalize(vNormal);
      vec3 V = normalize(vView);
      float lat = vObj.y;
      float lon = atan(vObj.z, vObj.x);
      // Gentle wobble so the bands look like weather, not stripes
      float warp = sin(lon * 3.0 + lat * 7.0) * 0.035 + sin(lon * 7.0 - lat * 3.0) * 0.015;
      float t = clamp(lat * 0.5 + 0.5 + warp, 0.0, 1.0);
      vec3 col = mix(cIndigo, cMagenta, smoothstep(0.1, 0.55, t));
      col = mix(col, cAmber, smoothstep(0.55, 0.95, t));
      float bands = sin((lat + warp) * 22.0) * 0.5 + 0.5;
      float fine = sin((lat + warp * 0.5) * 61.0) * 0.5 + 0.5;
      col *= 1.0 - uBands * (0.16 * bands + 0.07 * fine);
      vec3 L = normalize(vec3(-0.55, 0.45, 0.7));
      float diff = max(dot(N, L), 0.0);
      float light = 0.22 + 0.9 * smoothstep(-0.15, 0.85, diff);
      float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
      col = col * light + fres * vec3(1.0, 0.72, 0.95) * 0.55;
      gl_FragColor = vec4(col, 1.0);
    }`;

  // Ring: flat banded disc with a Cassini-style gap, fading at both edges
  const ringVert = `
    varying float vR;
    void main() {
      vR = length(position.xy);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;

  const ringFrag = `
    uniform vec3 cAmber;
    uniform vec3 cMagenta;
    uniform float uInner;
    uniform float uOuter;
    varying float vR;
    void main() {
      float t = clamp((vR - uInner) / (uOuter - uInner), 0.0, 1.0);
      float edge = smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.9, 1.0, t));
      float gap = 1.0 - 0.85 * (1.0 - smoothstep(0.0, 0.03, abs(t - 0.62)));
      float bands = 0.55 + 0.25 * sin(t * 70.0) + 0.2 * sin(t * 23.0 + 1.3);
      float a = edge * gap * bands * 0.85;
      vec3 col = mix(cAmber, cMagenta, smoothstep(0.0, 1.0, t));
      col = mix(col, vec3(1.0, 0.9, 0.95), 0.12);
      gl_FragColor = vec4(col, a);
    }`;

  function init() {
    const THREE = window.THREE;
    if (!THREE) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    host.prepend(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 7);

    const colors = {
      cAmber: { value: new THREE.Color('#F9C33A') },
      cMagenta: { value: new THREE.Color('#A21A86') },
      cIndigo: { value: new THREE.Color('#1828B1') },
    };

    const PLANET_R = 1.25;
    const RING_IN = 1.7;
    const RING_OUT = 2.75;

    const planetMat = new THREE.ShaderMaterial({ vertexShader: planetVert, fragmentShader: planetFrag, uniforms: Object.assign({ uBands: { value: 1 } }, colors) });
    const moonMat = new THREE.ShaderMaterial({ vertexShader: planetVert, fragmentShader: planetFrag, uniforms: Object.assign({ uBands: { value: 0 } }, colors) });
    const ringMat = new THREE.ShaderMaterial({
      vertexShader: ringVert, fragmentShader: ringFrag, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: Object.assign({ uInner: { value: RING_IN }, uOuter: { value: RING_OUT } }, colors),
    });

    // The whole system sits at Saturn-like tilt; the planet spins inside it
    const group = new THREE.Group();
    scene.add(group);
    const system = new THREE.Group();
    system.rotation.set(0.32, 0, 0.38);
    group.add(system);

    const planet = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R, 96, 64), planetMat);
    system.add(planet);

    const ring = new THREE.Mesh(new THREE.RingGeometry(RING_IN, RING_OUT, 180, 1), ringMat);
    ring.rotation.x = -Math.PI / 2; // lie flat in the planet's equator
    system.add(ring);

    // Moons orbit on circles well outside the ring, so they can pass behind the planet but never through it
    const moons = [
      { r: 0.16, orbit: 3.05, speed: 0.28, phase: 0.4, tilt: 0.12 },
      { r: 0.11, orbit: 3.4, speed: 0.19, phase: 2.6, tilt: -0.18 },
      { r: 0.08, orbit: 3.7, speed: 0.14, phase: 4.4, tilt: 0.24 },
    ].map((cfg) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(cfg.r, 32, 24), moonMat);
      m.userData = cfg;
      system.add(m);
      return m;
    });

    // Layout: planet sits right of the headline on wide screens, below it on phones
    const SCALE = 0.66; // the system is wider than the old shape, so scale it to the same footprint
    let base;
    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const compact = host.dataset.layout === 'compact';
      if (w / h < 0.9) base = compact ? { x: 0.9, y: 1.75, s: 0.42 } : { x: 0.75, y: -1.8, s: 0.5 };
      else if (w < 1100) base = compact ? { x: 1.9, y: 0.7, s: 0.6 } : { x: 1.45, y: 0.2, s: 0.8 };
      else base = compact ? { x: 2.55, y: 0.55, s: 0.7 } : { x: 2.05, y: 0.1, s: 0.92 };
    }
    resize();
    addEventListener('resize', resize);

    // Pointer drift
    const pointer = { x: 0, y: 0 }, eased = { x: 0, y: 0 };
    addEventListener('pointermove', (e) => {
      pointer.x = e.clientX / window.innerWidth - 0.5;
      pointer.y = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });

    // Fade in, then let scroll control opacity directly
    requestAnimationFrame(() => host.classList.add('ready'));
    setTimeout(() => host.classList.add('live'), 1300);

    let running = true;
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      if (running) { last = performance.now(); requestAnimationFrame(frame); }
    });

    const t0 = performance.now();
    let last = t0, time = 0;
    function frame(now) {
      if (!running) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt;

      // Entrance: grow in over the first 1.6s
      const intro = Math.min((now - t0) / 1600, 1);
      const introEase = 1 - Math.pow(1 - intro, 3);

      // Scroll: planet lifts away and the scene dims as windows cover it
      const p = Math.min(window.scrollY / window.innerHeight, 1.2);
      host.style.setProperty('--bg-opacity', String(Math.max(1 - p * 0.55, 0.35)));

      eased.x += (pointer.x - eased.x) * 0.05;
      eased.y += (pointer.y - eased.y) * 0.05;

      group.position.x = base.x + eased.x * 0.5;
      group.position.y = base.y - eased.y * 0.35 + p * 1.1;
      group.scale.setScalar(SCALE * base.s * (0.6 + 0.4 * introEase) * (1 - p * 0.12));
      // The cursor gently turns the whole system; the planet spins on its own axis
      group.rotation.y = eased.x * 0.5;
      group.rotation.x = eased.y * 0.3;
      planet.rotation.y = time * 0.15;

      moons.forEach((m) => {
        const c = m.userData;
        const a = time * c.speed + c.phase;
        m.position.set(Math.cos(a) * c.orbit, Math.sin(a) * c.orbit * c.tilt, Math.sin(a) * c.orbit);
      });

      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
})();
