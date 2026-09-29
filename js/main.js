/* =========================================================
   Portafolio — Sebastian Rodríguez (cvz-dev)
   Animaciones: GSAP + ScrollTrigger + SplitText, scroll suave con Lenis.
   Todo lo ambiental (luces de puntos, giros, parpadeos) vive en CSS.
   ========================================================= */
(() => {
  'use strict';

  const html = document.documentElement;
  const body = document.body;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const media = (q) => window.matchMedia(q).matches;
  const reduceMotion = media('(prefers-reduced-motion: reduce)');
  const finePointer = media('(hover: hover) and (pointer: fine)');

  /* ---------- Opciones de prueba por URL: ?hero=mapa&mono=CVZ&cursor=blanco ---------- */
  const params = new URLSearchParams(location.search);
  const pick = (key, allowed) => (allowed.includes(params.get(key)) ? params.get(key) : null);
  body.dataset.hero = pick('hero', ['monograma', 'mapa', 'terminal']) || body.dataset.hero;
  body.dataset.mono = pick('mono', ['SR', 'CVZ']) || body.dataset.mono;
  body.dataset.cursor = pick('cursor', ['puntos', 'blanco', 'sistema']) || body.dataset.cursor;

  /* =========================================================
     Contenido generado: monograma y visualizaciones
     ========================================================= */
  const GLYPHS = (() => {
    const O = ['0.6,0 1.4,0 2,0.6 2,3.4 1.4,4 0.6,4 0,3.4 0,0.6 0.6,0'];
    const P = ['0,4 0,0', '0,0 1.5,0 2,0.5 2,1.7 1.5,2.2 0,2.2'];
    return {
      C: ['2,0 0.6,0 0,0.6 0,3.4 0.6,4 2,4'],
      O,
      P,
      R: P.concat(['0.9,2.2 2,4']),
      S: ['2,0.4 1.6,0 0.4,0 0,0.4 0,1.6 0.4,2 1.6,2 2,2.4 2,3.6 1.6,4 0.4,4 0,3.6'],
      V: ['0,0 1,4 2,0'],
      Z: ['0,0 2,0 0,4 2,4'],
    };
  })();

  function buildMonogram(text) {
    const svg = $('.mono-svg');
    if (!svg) return;
    const letters = text.split('');
    const three = letters.length > 2;
    const u = three ? 40 : 56;
    const gap = three ? 30 : 64;
    const total = letters.length * 2 * u + (letters.length - 1) * gap;
    const x0 = (380 - total) / 2;
    const y0 = three ? 140 : 108;
    const width = three ? 12 : 14;

    const strokes = [];
    letters.forEach((ch, li) => {
      (GLYPHS[ch] || GLYPHS.O).forEach((stroke) => {
        const pts = stroke.split(' ').map((pt) => {
          const [x, y] = pt.split(',').map(Number);
          return `${(x0 + li * (2 * u + gap) + x * u).toFixed(1)} ${(y0 + y * u).toFixed(1)}`;
        });
        strokes.push(`M${pts.join(' L')}`);
      });
    });

    const fillGroup = (group, extra) => {
      group.replaceChildren();
      group.setAttribute('fill', 'none');
      group.setAttribute('stroke-width', extra.width);
      group.setAttribute('stroke-linecap', 'round');
      group.setAttribute('stroke-linejoin', 'round');
      strokes.forEach((d, i) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        if (extra.lit) {
          path.setAttribute('class', 'lit');
          path.style.animationDelay = `calc(var(--speed) * ${(i * 0.08).toFixed(2)})`;
        }
        group.appendChild(path);
      });
    };
    fillGroup($('.mono-base', svg), { width: width + 1 });
    fillGroup($('.mono-all', svg), { width });
    fillGroup($('.mono-lit', svg), { width, lit: true });
    $$('[data-initials]').forEach((el) => { el.textContent = text; });
  }

  // Generador pseudoaleatorio con semilla: los puntos salen iguales en cada carga.
  function seeded(seed) {
    return () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }

  function buildEmbeddings() {
    const viz = $('[data-embeddings]');
    if (!viz) return;
    const rnd = seeded(42);
    const centers = [[23, 40], [57, 66], [83, 32]];
    const frag = document.createDocumentFragment();
    const points = [];
    centers.forEach((c, ci) => {
      for (let i = 0; i < 24; i++) {
        const x = Math.max(2, Math.min(97, c[0] + (rnd() + rnd() - 1) * 14));
        const y = Math.max(4, Math.min(84, c[1] + (rnd() + rnd() - 1) * 26));
        const highlight = ci === 1 && i < 5;
        const size = highlight ? 8 : (rnd() > 0.6 ? 6 : 4);
        points.push({ x, y, size, highlight, delay: rnd() * 3.4 });
      }
    });
    points.sort((a, b) => a.x - b.x).forEach((p) => {
      const pt = document.createElement('span');
      pt.className = 'pt';
      pt.style.left = `${p.x.toFixed(2)}%`;
      pt.style.top = `${p.y.toFixed(2)}%`;
      const dot = document.createElement('i');
      dot.style.width = dot.style.height = `${p.size}px`;
      dot.style.background = p.highlight ? 'var(--accent)' : '#E6E6E6';
      dot.style.boxShadow = p.highlight ? '0 0 12px var(--accent)' : '0 0 6px rgba(255,255,255,.4)';
      dot.style.animationDelay = `${p.delay.toFixed(2)}s`;
      pt.appendChild(dot);
      frag.appendChild(pt);
    });
    viz.prepend(frag);
  }

  buildMonogram(body.dataset.mono === 'CVZ' ? 'CVZ' : 'SR');
  buildEmbeddings();
  // Artículo: regresión lineal interactiva (js/regresion.js)
  const regression = $('[data-regression]');
  if (regression && window.initRegression) window.initRegression(regression, { reduceMotion });

  // Nombre del hero: letras que se revuelven cerca del cursor (js/scramble.js)
  const heroName = $('.hero-name');
  let heroScramble = null;
  if (heroName && window.initScramble) {
    // Con GSAP, la entrada del hero lanza el scramble junto con el parpadeo (ver heroIntro)
    document.fonts.ready.then(() => { heroScramble = window.initScramble(heroName, { intro: !hasGsap, introDuration: 2200 }); });
  }

  /* =========================================================
     Interacciones que no dependen de GSAP
     ========================================================= */
  const nav = $('.nav');
  const menu = $('#menu');
  const menuBtn = $('.menu-btn');

  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  }
  menuBtn.addEventListener('click', () => setMenu(menu.hidden));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });

  // Copiar correo (botón de contacto y comando `correo` de la terminal); el aviso es global
  const copyBtn = $('.copy-btn');
  const toast = $('.toast');
  let toastTimer = 0;
  async function copyEmail() {
    const email = $('[data-email]').dataset.email;
    let ok = true;
    try { await navigator.clipboard.writeText(email); } catch { ok = false; }
    toast.textContent = ok ? 'Correo copiado' : 'No se pudo copiar';
    copyBtn.classList.toggle('is-copied', ok);
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
      copyBtn.classList.remove('is-copied');
    }, 1900);
    return ok;
  }
  copyBtn.addEventListener('click', copyEmail);

  // Terminal interactiva del hero (js/terminal.js). El scroll suave lo pone Lenis si está activo.
  let smoothScrollTo = null;
  const term = window.initTerminal
    ? window.initTerminal($('[data-term]'), {
      copyEmail,
      scramble: () => heroScramble && heroScramble.decode(900),
      scrollTo: (el) => {
        if (smoothScrollTo) smoothScrollTo(el);
        else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' });
      },
    })
    : { boot() {} };

  // Efectos de cursor (solo mouse): luz en tarjetas, cuadrícula del hero, reflejo del panel
  if (finePointer && !reduceMotion) {
    $$('.spot').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  // Cuadrícula de LEDs (hero y contacto): la luz sigue al mouse con un poco de inercia,
  // se abre al moverlo rápido y cada clic lanza una onda de puntos.
  // Devuelve el estado del halo (coordenadas dentro de la sección) para que otros efectos lo lean.
  function ledField(section) {
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0, r: 240, inside: false };
    let speed = 0;
    let raf = 0;
    const tick = () => {
      cur.x += (target.x - cur.x) * 0.16;
      cur.y += (target.y - cur.y) * 0.16;
      speed *= 0.9;
      cur.r += (240 + Math.min(speed, 80) * 2.2 - cur.r) * 0.12;
      section.style.setProperty('--fx', `${cur.x}px`);
      section.style.setProperty('--fy', `${cur.y}px`);
      section.style.setProperty('--fr', `${cur.r}px`);
      const moving = Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) > 0.2 || cur.r - 240 > 0.5;
      raf = moving ? requestAnimationFrame(tick) : 0;
    };
    section.addEventListener('pointerenter', (e) => {
      const r = section.getBoundingClientRect();
      cur.x = target.x = e.clientX - r.left;
      cur.y = target.y = e.clientY - r.top;
      cur.inside = e.pointerType === 'mouse';
    });
    section.addEventListener('pointerleave', () => { cur.inside = false; });
    section.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = section.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      speed = Math.max(speed, Math.hypot(x - target.x, y - target.y));
      target.x = x; target.y = y;
      cur.inside = true;
      if (!raf) raf = requestAnimationFrame(tick);
    });
    section.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = section.getBoundingClientRect();
      const ripple = document.createElement('div');
      ripple.className = 'led-ripple';
      ripple.setAttribute('aria-hidden', 'true');
      ripple.style.setProperty('--cx', `${e.clientX - r.left}px`);
      ripple.style.setProperty('--cy', `${e.clientY - r.top}px`);
      ripple.addEventListener('animationend', () => ripple.remove());
      section.prepend(ripple);
    });
    return cur;
  }

  // Los puntos de cada sección se dibujan desde su propia esquina: se recorren para que
  // coincidan con la cuadrícula del body (22px) sin importar dónde quede la sección
  const alignDots = () => {
    $$('.ledfield').forEach((el) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--dot-ox', `${-((r.left + scrollX) % 22)}px`);
      el.style.setProperty('--dot-oy', `${-((r.top + scrollY) % 22)}px`);
    });
  };
  alignDots();
  new ResizeObserver(alignDots).observe(body);

  // Botones iluminados por las luces de su sección (hero y contacto): el halo del mouse sobre los LEDs,
  // el barrido que recorre el letrero (`sign`, que anima --sx) y, en azul, lo que devuelva `blueLight()`
  // (la letra encendida de HABLEMOS o el punto del nombre donde está el mouse).
  // Cada botón recibe la intensidad (--lw / --lb) y el punto de donde le llega la luz
  // (--lx --ly / --lbx --lby); el CSS dibuja con eso el reflejo en el borde y en el vidrio.
  // `reach` multiplica el alcance del letrero, para cuando los botones quedan más lejos de él (hero).
  function sectionLights(section, field, { sign, blueLight, reach = 1 }) {
    const btns = $$('.btn', section);
    const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
    const falloff = (d, radius) => { const t = Math.max(0, 1 - d / radius); return t * t; };
    // Valores suavizados por botón, para que la luz entre y salga sin saltos
    const state = btns.map(() => ({ w: { i: 0, x: 0, y: 0 }, b: { i: 0, x: 0, y: 0 } }));
    // Suma las luces que le llegan a un botón: intensidad total y punto promedio de llegada.
    // El punto queda sobre el borde más cercano a cada fuente, un poco hacia afuera.
    const receive = (r, lights) => {
      let sum = 0; let px = 0; let py = 0;
      for (const l of lights) {
        const nx = clamp(l.x, r.left, r.right);
        const ny = clamp(l.y, r.top, r.bottom);
        const dx = l.x - nx; const dy = l.y - ny;
        const d = Math.hypot(dx, dy);
        const w = l.s * falloff(d, l.r);
        if (!w) continue;
        const k = d ? Math.min(d, 14) / d : 0;
        sum += w;
        px += w * (nx + dx * k - r.left);
        py += w * (ny + dy * k - r.top);
      }
      return sum ? { i: Math.min(1, sum), x: px / sum, y: py / sum } : { i: 0 };
    };
    const ease = (s, t) => {
      s.i += (t.i - s.i) * 0.14;
      if (t.i) { s.x += (t.x - s.x) * 0.25; s.y += (t.y - s.y) * 0.25; }
    };

    let visible = false;
    let raf = 0;
    const tick = () => {
      // Lecturas primero, escrituras después (evita recalcular el layout a media vuelta)
      const sr = section.getBoundingClientRect();
      const wr = sign.getBoundingClientRect();
      const sx = parseFloat(getComputedStyle(sign).getPropertyValue('--sx'));
      const white = [];
      const blue = [];
      if (field.inside) white.push({ x: sr.left + field.x, y: sr.top + field.y, s: 0.9, r: 280 });
      // El barrido solo alumbra mientras pasa sobre el letrero y se apaga suave en las orillas
      const cx = wr.left + sx * wr.width;
      const edge = Math.min(cx - wr.left, wr.right - cx) / (wr.width * 0.15);
      if (edge > 0) white.push({ x: cx, y: wr.bottom - wr.height * 0.35, s: 0.85 * Math.min(1, edge), r: 520 * reach });
      const bl = blueLight();
      if (bl) blue.push({ x: bl.x, y: bl.y, s: 1, r: 640 * reach });
      const rects = btns.map((b) => b.getBoundingClientRect());

      btns.forEach((b, i) => {
        const st = state[i];
        ease(st.w, receive(rects[i], white));
        ease(st.b, receive(rects[i], blue));
        b.style.setProperty('--lw', st.w.i.toFixed(3));
        b.style.setProperty('--lx', `${st.w.x.toFixed(1)}px`);
        b.style.setProperty('--ly', `${st.w.y.toFixed(1)}px`);
        b.style.setProperty('--lb', st.b.i.toFixed(3));
        b.style.setProperty('--lbx', `${st.b.x.toFixed(1)}px`);
        b.style.setProperty('--lby', `${st.b.y.toFixed(1)}px`);
      });
      raf = visible ? requestAnimationFrame(tick) : 0;
    };
    // Solo corre mientras la sección está en pantalla
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(tick);
    }).observe(section);
  }

  if (!reduceMotion) {
    const hero = $('.hero');
    const contact = $('#contacto');
    const heroField = ledField(hero);
    const contactField = ledField(contact);
    if (finePointer) {
      // Hero: la luz azul sale del punto del nombre donde está el mouse (ahí se revuelven las letras)
      let namePoint = null;
      heroName.addEventListener('pointermove', (e) => { namePoint = { x: e.clientX, y: e.clientY }; });
      heroName.addEventListener('pointerleave', () => { namePoint = null; });
      sectionLights(hero, heroField, { sign: heroName, blueLight: () => namePoint, reach: 1.5 });

      // Contacto: la luz azul sale del centro de la letra de HABLEMOS encendida
      let letter = null;
      $$('.hl', contact).forEach((el) => {
        el.addEventListener('pointerenter', () => { letter = el; });
        el.addEventListener('pointerleave', () => { if (letter === el) letter = null; });
      });
      sectionLights(contact, contactField, {
        sign: $('.big-word', contact),
        blueLight: () => {
          if (!letter) return null;
          const r = letter.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        },
      });
    }
  }

  /* =========================================================
     Sin GSAP (no cargó) o con "reducir movimiento": versión estática
     ========================================================= */
  const hasGsap = window.gsap && window.ScrollTrigger && window.SplitText;

  function staticMode() {
    html.classList.remove('js');
    html.classList.add('is-ready');
    const links = $$('.nav-links .navlink');
    const sections = ['sobre-mi', 'proyectos', 'certificados', 'contacto'].map((id) => document.getElementById(id));
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      body.classList.toggle('is-scrolled', scrollY > 40);
      let current = '';
      sections.forEach((s) => { if (s.getBoundingClientRect().top < innerHeight * 0.45) current = s.id; });
      links.forEach((a) => a.classList.toggle('is-active', a.hash === `#${current}`));
    };
    addEventListener('scroll', update, { passive: true });
    update();
    $$('a[href="#"]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));
    $$('.menu a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
    term.boot();
  }

  if (!hasGsap || reduceMotion) {
    staticMode();
    return;
  }

  try {
    initMotion();
  } catch (err) {
    console.error('[portafolio] Falló la inicialización de animaciones:', err);
    staticMode();
  }

  /* =========================================================
     Animaciones con GSAP
     ========================================================= */
  function initMotion() {
    const { gsap, ScrollTrigger, SplitText } = window;
    gsap.registerPlugin(ScrollTrigger, SplitText);
    gsap.defaults({ ease: 'expo.out', duration: 1.1 });

    /* ---------- Scroll suave (Lenis) sincronizado con ScrollTrigger ---------- */
    const lenis = window.Lenis ? new window.Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true }) : null;
    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
      smoothScrollTo = (el) => lenis.scrollTo(el, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
    }

    // Anclas internas con scroll suave; los enlaces "#" (placeholders) no saltan arriba
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const hash = a.getAttribute('href');
        if (hash === '#') { e.preventDefault(); return; }
        const target = document.querySelector(hash);
        if (!target) return;
        e.preventDefault();
        setMenu(false);
        if (lenis) lenis.scrollTo(target, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
        else target.scrollIntoView({ behavior: 'smooth' });
      });
    });

    /* ---------- Estados iniciales ---------- */
    const reveals = $$('.reveal');
    gsap.set(reveals, { autoAlpha: 0, y: 36, filter: 'blur(10px)' });
    gsap.set('.reveal .sub', { autoAlpha: 0, y: 14 });
    gsap.set('.pt', { autoAlpha: 0, scale: 0 });
    gsap.set('.bars .fill', { scaleX: 0 });
    gsap.set('.led-in, .hl, .hero-name', { autoAlpha: 0 });
    gsap.set('.tilt', { '--rx': 0, '--ry': 0 });
    gsap.set('.magnet', { '--tx': 0, '--ty': 0 });
    gsap.set('.device', { '--py': 0 });

    /* ---------- Entrada del hero (espera a las fuentes para partir bien el texto) ---------- */
    document.fonts.ready.then(() => {
      html.classList.add('is-ready');
      heroIntro();
      splitSectionTitles();
      aboutWords();
      ScrollTrigger.refresh();
    });

    function ledFlicker(target, opts = {}) {
      return gsap.to(target, {
        keyframes: { autoAlpha: [0, 0.9, 0.1, 1, 0.25, 1] },
        duration: 1.1,
        ease: 'none',
        stagger: opts.stagger || 0,
        delay: opts.delay || 0,
      });
    }

    function heroIntro() {
      const title = SplitText.create('.hero-title', { type: 'words', mask: 'words' });
      const tl = gsap.timeline({ delay: 0.1 });
      tl.from('.nav', { y: -24, autoAlpha: 0, duration: 1.2 })
        .add(ledFlicker('.hero-name'), 0.2)
        // El nombre aparece revuelto, sigue así mientras parpadea y luego se descifra
        .call(() => heroScramble && heroScramble.decode(1600, { hold: 700 }), null, 0.2)
        .from(title.words, { yPercent: 110, duration: 1.2, stagger: 0.07 }, 0.35)
        .fromTo('.hero-lead', { autoAlpha: 0, y: 24, filter: 'blur(8px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)' }, 0.6)
        .fromTo('.hero-actions', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0 }, 0.72)
        .add(body.dataset.hero === 'terminal' ? termIntro() : deviceIntro(), 0.3)
        .fromTo('.hero-foot', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, 0.9);
      tl.eventCallback('onComplete', () => term.boot());
    }

    function deviceIntro() {
      return gsap.fromTo('.device', { autoAlpha: 0, y: 40, scale: 0.96, filter: 'blur(12px)' },
        { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1.6, clearProps: 'filter,scale' });
    }

    // Terminal: sube, se "enciende" abriéndose desde una línea horizontal y luego aparece su interfaz.
    // Sin filter en los padres: rompería el backdrop-filter del vidrio y aparecería de golpe al final.
    // (El transform de .term lo controla terminal.js, por eso se animan .device y clip-path.)
    function termIntro() {
      const parts = ['.term-head > *', '.term-quick button'];
      return gsap.timeline()
        .fromTo('.device', { autoAlpha: 0, y: 50, scale: 0.97 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 1.4, ease: 'expo.out', clearProps: 'scale' }, 0)
        .fromTo('.term', { clipPath: 'inset(49% 0% 49% 0% round 28px)' },
          { clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.1, ease: 'expo.inOut', clearProps: 'clipPath' }, 0.1)
        .fromTo('.term-halo', { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 1.4, ease: 'power2.out' }, 0.5)
        .fromTo(parts, { autoAlpha: 0, y: 8 },
          { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out', clearProps: 'transform' }, 0.85);
    }

    /* ---------- Títulos de sección: líneas que suben desde una máscara ---------- */
    function splitSectionTitles() {
      $$('[data-lines]').forEach((el) => {
        SplitText.create(el, {
          type: 'lines',
          mask: 'lines',
          linesClass: 'split-line',
          autoSplit: true,
          onSplit: (self) => gsap.from(self.lines, {
            yPercent: 110,
            duration: 1.3,
            stagger: 0.08,
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          }),
        });
      });
    }

    /* ---------- "Sobre mí": el texto se ilumina palabra por palabra ---------- */
    function aboutWords() {
      const el = $('[data-words]');
      const split = SplitText.create(el, { type: 'words' });
      const mm = gsap.matchMedia();
      // Cada palabra tarda bastante en encenderse y se traslapa con las siguientes:
      // se ve una ola que avanza poco a poco, no palabras que se prenden de golpe.
      const tween = (trigger) => gsap.fromTo(split.words, { opacity: 0.16 }, {
        opacity: 1,
        duration: 1.6,
        ease: 'power1.inOut',
        stagger: 0.1,
        scrollTrigger: trigger,
      });
      mm.add('(min-width: 1101px)', () => {
        // En escritorio la sección entera (una pantalla) se queda fija hasta que "Proyectos"
        // termina de subir encima de ella. El tramo de lectura lo da el margen --about-hold (CSS):
        // la iluminación empieza a los 30px y termina 100px antes de que "Proyectos" empiece a cubrirla.
        const hold = () => parseFloat(getComputedStyle($('.about')).getPropertyValue('--about-hold')) || 700;
        const pin = ScrollTrigger.create({ trigger: '.about', start: 'top top', endTrigger: '#proyectos', end: 'top top', pin: true, pinSpacing: false, anticipatePin: 1 });
        tween({ trigger: el, start: () => pin.start + 30, end: () => pin.start + hold() - 100, scrub: 0.5 });
        // Se sigue viendo a través del vidrio de "Proyectos" mientras sube, pero se desvanece en el
        // último tramo: cuando "Proyectos" llega arriba, "Sobre mí" ya no se ve detrás
        gsap.fromTo('.about > *', { opacity: 1 }, {
          opacity: 0, ease: 'power1.in',
          scrollTrigger: { trigger: '#proyectos', start: 'top 45%', end: 'top 5%', scrub: true },
        });
      });
      mm.add('(max-width: 1100px)', () => {
        tween({ trigger: el, start: 'top 80%', end: 'bottom 30%', scrub: 1.2 });
      });
    }

    /* ---------- Aparición de tarjetas y bloques al hacer scroll ---------- */
    ScrollTrigger.batch(reveals, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) => {
        gsap.to(batch, {
          autoAlpha: 1, y: 0, filter: 'blur(0px)',
          duration: 1.2, stagger: 0.09,
          clearProps: 'transform,filter',
        });
        batch.forEach((el, i) => revealDetails(el, 0.25 + i * 0.09));
      },
    });

    function revealDetails(el, delay) {
      const tl = gsap.timeline({ delay });
      const subs = $$('.sub', el);
      if (subs.length) tl.to(subs, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.06, clearProps: 'transform' }, 0);
      const pts = $$('.pt', el);
      if (pts.length) tl.to(pts, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(2)', stagger: 0.012 }, 0.05);
      const bars = $$('.bars .fill', el);
      if (bars.length) tl.to(bars, { scaleX: 1, duration: 0.9, stagger: 0.12 }, 0.3);
      const led = $$('.led-in', el);
      if (led.length) tl.add(ledFlicker(led), 0.1);
      const letters = $$('.hl', el);
      if (letters.length) tl.add(ledFlicker(letters, { stagger: 0.07 }), 0);
    }

    /* ---------- Nav compacta y sección activa ---------- */
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => body.classList.toggle('is-scrolled', self.scroll() > 40),
      onRefresh: (self) => body.classList.toggle('is-scrolled', self.scroll() > 40),
    });
    const links = $$('.nav-links .navlink');
    ['sobre-mi', 'proyectos', 'certificados', 'contacto'].forEach((id) => {
      ScrollTrigger.create({
        trigger: `#${id}`, start: 'top 45%', end: 'bottom 45%',
        onToggle: (self) => {
          if (self.isActive) links.forEach((a) => a.classList.toggle('is-active', a.hash === `#${id}`));
          else if (id === 'sobre-mi' && self.direction < 0) links.forEach((a) => a.classList.remove('is-active'));
        },
      });
    });

    /* ---------- Hero: texto y panel suben al bajar, el panel algo menos (solo escritorio) ---------- */
    gsap.matchMedia().add('(min-width: 1101px)', () => {
      const st = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.5 };
      gsap.to('.hero-copy', { y: -90, opacity: 0.25, ease: 'none', scrollTrigger: st });
      // El panel usa la propiedad CSS `translate` para no pisar su inclinación 3D
      gsap.to('.device', { '--py': -50, ease: 'none', scrollTrigger: st });
    });

    /* ---------- Marquee: velocidad y dirección reaccionan al scroll ---------- */
    // Posición calculada en cada fotograma (no un tween): la velocidad se acerca a su
    // objetivo de forma suave, así el scroll, el cambio de sentido y el hover no dan tirones.
    const marquee = $('.marquee-wrap');
    const track = $('.marquee', marquee);
    const setX = gsap.quickSetter(track, 'x', 'px');
    const LOOP_SECONDS = 40;      // lo que tarda un grupo en pasar completo a velocidad normal
    let groupW = $('.marquee-group', track).getBoundingClientRect().width;
    let x = 0;
    let speed = 1;                // 1 = velocidad normal hacia la izquierda; negativo = hacia la derecha
    let dir = 1;                  // sentido del último scroll: 1 al bajar (izquierda), -1 al subir (derecha)
    let boost = 0;                // impulso extra del scroll, siempre positivo
    let hovered = false;
    let visible = true;

    const onScrollVelocity = (velocity) => {
      if (Math.abs(velocity) < 0.5) return;
      dir = velocity > 0 ? 1 : -1;
      const push = Math.min(Math.abs(velocity) / 6, 5);
      if (push > boost) boost = push;
    };
    if (lenis) {
      lenis.on('scroll', ({ velocity }) => onScrollVelocity(velocity));
    } else {
      let lastY = scrollY;
      addEventListener('scroll', () => { onScrollVelocity(scrollY - lastY); lastY = scrollY; }, { passive: true });
    }
    marquee.addEventListener('mouseenter', () => { hovered = true; });
    marquee.addEventListener('mouseleave', () => { hovered = false; });
    addEventListener('resize', () => { groupW = $('.marquee-group', track).getBoundingClientRect().width; });
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(marquee);

    gsap.ticker.add((time, deltaMs) => {
      if (!visible || !groupW) return;
      const dt = Math.min(deltaMs, 50) / 1000;
      boost *= Math.exp(-dt * 2.5);                   // el impulso del scroll se apaga poco a poco
      // Conserva el sentido del último scroll: al subir va a la derecha hasta que vuelvas a bajar
      const target = hovered ? 0 : dir * (1 + boost);
      speed += (target - speed) * (1 - Math.exp(-dt * (hovered ? 5 : 3)));
      x -= speed * (groupW / LOOP_SECONDS) * dt;
      x %= groupW;                                    // dos grupos iguales: recorrer uno es un ciclo exacto
      if (x > 0) x -= groupW;
      setX(x);
    });

    /* ---------- Cursor: inclinación 3D del panel y botones magnéticos ---------- */
    if (finePointer && body.dataset.hero !== 'terminal') {  // la terminal tiene su propia inclinación
      const tilt = $('.tilt');
      const rx = gsap.quickTo(tilt, '--rx', { duration: 0.9, ease: 'power3' });
      const ry = gsap.quickTo(tilt, '--ry', { duration: 0.9, ease: 'power3' });
      tilt.addEventListener('pointermove', (e) => {
        const r = tilt.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        ry(nx * 14);
        rx(-ny * 12);
        tilt.style.setProperty('--gx', `${(nx + 0.5) * 100}%`);
        tilt.style.setProperty('--gy', `${(ny + 0.5) * 100}%`);
      });
      tilt.addEventListener('pointerleave', () => { rx(0); ry(0); });
    }

    if (finePointer) {
      // Desplazamiento máximo en px: con el anillo del hover (4px) no alcanza al botón de al lado
      const MAX = 5;
      const clampMax = gsap.utils.clamp(-MAX, MAX);
      $$('.magnet').forEach((el) => {
        const tx = gsap.quickTo(el, '--tx', { duration: 0.6, ease: 'power3' });
        const ty = gsap.quickTo(el, '--ty', { duration: 0.6, ease: 'power3' });
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          tx(clampMax((e.clientX - r.left - r.width / 2) * 0.12));
          ty(clampMax((e.clientY - r.top - r.height / 2) * 0.2));
        });
        el.addEventListener('pointerleave', () => { tx(0); ty(0); });
      });
    }

    // Recalcular posiciones cuando todo terminó de cargar (imágenes, fuentes tardías)
    addEventListener('load', () => ScrollTrigger.refresh());
  }
})();
