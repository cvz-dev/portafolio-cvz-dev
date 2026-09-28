/* =========================================================
   Text scramble por proximidad del cursor. JavaScript puro, sin dependencias.

   Pensado para fuentes de puntos (Doto): cada letra se descompone en sus puntos y,
   al cambiar de carácter, los puntos viajan a su nueva posición en un <canvas>,
   así parece que la matriz se reacomoda en vez de saltar de un carácter a otro.

   Uso:
     const scramble = initScramble(el, {
       radius: 80,                  // px alrededor del cursor que revuelven letras (en vertical
                                    // no pasa de media línea: no alcanza a la fila de al lado)
       charset: 'ABC…',             // caracteres aleatorios
       resolveDelay: [150, 400],    // ms antes de volver a la letra original (lejos → cerca)
       accentColor: 'var(--accent)',// color mientras la letra está revuelta
       swapEvery: 40,               // ms entre cambios de carácter
       intro: true,                 // al montar: aparece revuelto y se decodifica en ~1s
     });
     scramble.decode(600);          // revuelve todo y decodifica de izquierda a derecha
     scramble.destroy();            // quita listeners y restaura el HTML original
   ========================================================= */
(() => {
  'use strict';

  const DEFAULTS = {
    radius: 80,
    charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!<>-_\\/[]{}=+*^?#',
    resolveDelay: [150, 400],
    accentColor: 'var(--accent, currentColor)',
    swapEvery: 40,
    touchDuration: 600,
    intro: false,
    introDuration: 1000,
  };

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const easeOut = (t) => 1 - (1 - t) ** 3;

  /* ---------- Puntos de cada carácter ----------
     Se dibuja el carácter en grande en un canvas oculto y se buscan sus puntos
     (regiones conectadas). Las posiciones quedan en `em`, relativas al origen del
     carácter (x) y a la línea base (y), así sirven para cualquier tamaño de fuente. */
  const SAMPLE = 300;

  function createGlyphSampler(font) {
    const cache = new Map();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.font = `${font.weight} ${SAMPLE}px ${font.family}`;
    const m = ctx.measureText('M');
    const metrics = { ascent: m.fontBoundingBoxAscent / SAMPLE, descent: m.fontBoundingBoxDescent / SAMPLE };
    let dotSize = 0.087;

    function sample(ch) {
      if (cache.has(ch)) return cache.get(ch);
      const pad = SAMPLE * 0.3;
      const W = Math.ceil(SAMPLE * 1.2 + pad * 2);
      const H = Math.ceil(SAMPLE * 1.8);
      const baseline = SAMPLE * 1.3;
      canvas.width = W;
      canvas.height = H;
      ctx.font = `${font.weight} ${SAMPLE}px ${font.family}`;
      ctx.fillStyle = '#fff';
      ctx.fillText(ch, pad, baseline);
      const data = ctx.getImageData(0, 0, W, H).data;

      const seen = new Uint8Array(W * H);
      const dots = [];
      const sizes = [];
      const stack = [];
      for (let i = 0; i < W * H; i++) {
        if (seen[i] || data[i * 4 + 3] < 128) continue;
        seen[i] = 1;
        stack.push(i);
        let sx = 0, sy = 0, n = 0, x0 = W, x1 = 0, y0 = H, y1 = 0;
        while (stack.length) {
          const p = stack.pop();
          const x = p % W, y = (p / W) | 0;
          sx += x; sy += y; n++;
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
          if (x > 0 && !seen[p - 1] && data[(p - 1) * 4 + 3] >= 128) { seen[p - 1] = 1; stack.push(p - 1); }
          if (x < W - 1 && !seen[p + 1] && data[(p + 1) * 4 + 3] >= 128) { seen[p + 1] = 1; stack.push(p + 1); }
          if (y > 0 && !seen[p - W] && data[(p - W) * 4 + 3] >= 128) { seen[p - W] = 1; stack.push(p - W); }
          if (y < H - 1 && !seen[p + W] && data[(p + W) * 4 + 3] >= 128) { seen[p + W] = 1; stack.push(p + W); }
        }
        dots.push({ x: (sx / n + 0.5 - pad) / SAMPLE, y: (sy / n + 0.5 - baseline) / SAMPLE });
        sizes.push(Math.min(x1 - x0 + 1, y1 - y0 + 1));
      }
      if (sizes.length && ch !== ' ') {
        sizes.sort((a, b) => a - b);
        dotSize = sizes[sizes.length >> 1] / SAMPLE;
      }
      sortDots(dots);
      cache.set(ch, dots);
      return dots;
    }

    return { sample, metrics, get dotSize() { return dotSize; } };
  }

  // Orden de lectura (fila por fila, de izquierda a derecha): al emparejar puntos
  // de dos caracteres, cada punto viaja a uno cercano y el movimiento se ve ordenado.
  function sortDots(dots) {
    return dots.sort((a, b) => (Math.round(a.y * 20) - Math.round(b.y * 20)) || (a.x - b.x));
  }

  function initScramble(element, options = {}) {
    const noop = { decode() {}, destroy() {} };
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return noop;

    const opts = { ...DEFAULTS, ...options };
    const [delayMin, delayMax] = Array.isArray(opts.resolveDelay)
      ? opts.resolveDelay
      : [opts.resolveDelay, opts.resolveDelay];
    const charset = Array.from(opts.charset);

    /* ---------- Separar el texto en un <span> por carácter ---------- */
    const originalHTML = element.innerHTML;
    const originalPosition = element.style.position;
    const hadLabel = element.hasAttribute('aria-label');
    if (!hadLabel) {
      // Los <br> cuentan como espacio: "Sebastian<br>Rodríguez" → "Sebastian Rodríguez"
      const copy = element.cloneNode(true);
      copy.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
      element.setAttribute('aria-label', copy.textContent.replace(/\s+/g, ' ').trim());
    }

    const letters = [];
    const split = (source, target) => {
      source.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          node.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            // Los espacios quedan como texto normal: no se animan
            if (/^\s+$/.test(part)) { target.appendChild(document.createTextNode(part)); return; }
            // Cada palabra en un contenedor sin salto de línea, para que no se parta a media palabra
            const word = document.createElement('span');
            word.setAttribute('aria-hidden', 'true');
            word.style.whiteSpace = 'nowrap';
            Array.from(part).forEach((ch) => {
              const el = document.createElement('span');
              el.setAttribute('aria-hidden', 'true');
              el.textContent = ch;
              el.style.display = 'inline-block';
              word.appendChild(el);
              letters.push({
                el, ch, cur: ch,
                cx: 0, cy: 0, ry: 0, lx: 0, ly: 0, h: 0,
                on: false, held: false, leftAt: null, until: null, jitter: 0, swapAt: 0,
                parts: [], t0: 0, dur: 1, settleUntil: 0,
              });
            });
            target.appendChild(word);
          });
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const clone = node.cloneNode(false);
          if (clone.tagName !== 'BR') clone.setAttribute('aria-hidden', 'true');
          split(node, clone);
          target.appendChild(clone);
        }
      });
    };
    const frag = document.createDocumentFragment();
    split(element, frag);
    element.replaceChildren(frag);
    if (!letters.length) return noop;

    /* ---------- Canvas donde se mueven los puntos ---------- */
    if (getComputedStyle(element).position === 'static') element.style.position = 'relative';
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;pointer-events:none;opacity:.8;';
    element.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const cs = getComputedStyle(element);
    const glyphs = createGlyphSampler({ weight: cs.fontWeight, family: cs.fontFamily });

    // Resuelve el color (puede venir como var(--x)) a un valor que entienda el canvas
    const probe = document.createElement('span');
    probe.style.color = opts.accentColor;
    element.appendChild(probe);
    const fill = getComputedStyle(probe).color;
    probe.remove();

    let fontSize = 0;
    let dpr = 1;
    let canvasRect = null;

    /* ---------- Medidas ---------- */
    // Ancho fijo por letra, medido con el carácter original: el texto no se mueve al revolverse.
    function measureWidths() {
      letters.forEach((l) => { l.el.style.width = ''; });
      const widths = letters.map((l) => l.el.getBoundingClientRect().width);
      letters.forEach((l, i) => { l.el.style.width = `${widths[i]}px`; });

      fontSize = parseFloat(getComputedStyle(element).fontSize);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      // El canvas sobresale un poco para que quepan acentos y descendentes
      const pad = Math.ceil(fontSize * 0.4);
      canvas.style.left = `${-pad}px`;
      canvas.style.top = `${-pad}px`;
      canvas.style.width = `${element.clientWidth + pad * 2}px`;
      canvas.style.height = `${element.clientHeight + pad * 2}px`;
      canvas.width = Math.round((element.clientWidth + pad * 2) * dpr);
      canvas.height = Math.round((element.clientHeight + pad * 2) * dpr);
    }

    function measurePositions() {
      canvasRect = canvas.getBoundingClientRect();
      const { ascent, descent } = glyphs.metrics;
      letters.forEach((l) => {
        const r = l.el.getBoundingClientRect();
        l.cx = r.left + r.width / 2;
        l.cy = r.top + r.height / 2;
        l.ry = Math.min(opts.radius, r.height / 2);
        // Origen del carácter dentro del canvas: borde izquierdo y línea base
        // (media interlínea arriba + ascendente, como lo coloca el navegador)
        l.lx = r.left - canvasRect.left;
        l.ly = r.top - canvasRect.top + (r.height - (ascent + descent) * fontSize) / 2 + ascent * fontSize;
      });
    }

    measureWidths();
    measurePositions();

    /* ---------- Puntos en movimiento ---------- */
    function currentPoints(l, now) {
      const e = easeOut(clamp01((now - l.t0) / l.dur));
      return l.parts.map((p) => ({ x: p.fx + (p.tx - p.fx) * e, y: p.fy + (p.ty - p.fy) * e }));
    }

    // Manda los puntos actuales de la letra hacia los puntos de `ch`.
    // Si sobran puntos, se funden con su vecino; si faltan, nacen de uno cercano.
    function morphTo(l, ch, now, dur) {
      const from = l.parts.length ? sortDots(currentPoints(l, now)) : glyphs.sample(l.cur);
      const to = glyphs.sample(ch);
      const m = from.length;
      const n = to.length;
      const parts = [];
      if (m && n) {
        for (let j = 0; j < n; j++) {
          const s = from[Math.floor((j * m) / n)];
          parts.push({ fx: s.x, fy: s.y, tx: to[j].x, ty: to[j].y });
        }
        if (m > n) {
          const used = new Set(to.map((_, j) => Math.floor((j * m) / n)));
          from.forEach((s, i) => {
            if (used.has(i)) return;
            const t = to[Math.floor((i * n) / m)];
            parts.push({ fx: s.x, fy: s.y, tx: t.x, ty: t.y });
          });
        }
      } else {
        to.forEach((t) => parts.push({ fx: t.x, fy: t.y, tx: t.x, ty: t.y }));
      }
      l.parts = parts;
      l.cur = ch;
      l.t0 = now;
      l.dur = dur;
    }

    function draw(now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = fill;
      const size = glyphs.dotSize * fontSize;
      letters.forEach((l) => {
        if (!l.parts.length) return;
        const e = easeOut(clamp01((now - l.t0) / l.dur));
        l.parts.forEach((p) => {
          const x = l.lx + (p.fx + (p.tx - p.fx) * e) * fontSize;
          const y = l.ly + (p.fy + (p.ty - p.fy) * e) * fontSize;
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        });
      });
    }

    /* ---------- Estado de cada letra ---------- */
    const randomChar = (current) => {
      let c;
      do { c = charset[(Math.random() * charset.length) | 0]; } while (c === current && charset.length > 1);
      return c;
    };

    function setOn(l, on, now) {
      if (l.on === on) return;
      l.on = on;
      if (on) {
        l.settleUntil = 0;
        l.el.style.color = 'transparent'; // el texto real se oculta; el canvas dibuja la letra
        if (!l.parts.length) morphTo(l, l.ch, now, 1);
        l.swapAt = -Infinity;
      } else {
        // Los puntos regresan a la letra original y, al llegar, vuelve el texto real
        const dur = opts.swapEvery * 2;
        morphTo(l, l.ch, now, dur);
        l.settleUntil = now + dur;
      }
    }

    // Cuanto más lejos está el cursor, antes se resuelve la letra: deja una estela que se apaga.
    // `d` va normalizada: 1 es el borde del área de acción.
    const delayFor = (d) => delayMax - (delayMax - delayMin) * clamp01(d - 1);

    /* ---------- Bucle (requestAnimationFrame, solo mientras hay algo que animar) ---------- */
    let raf = 0;
    let pointer = null;
    let layoutDirtyUntil = 0; // tras un scroll, las posiciones pueden seguir moviéndose (parallax)

    const request = () => { if (!raf) raf = requestAnimationFrame(tick); };

    function tick(now) {
      raf = 0;
      if (now < layoutDirtyUntil) measurePositions();
      let active = now < layoutDirtyUntil;

      letters.forEach((l) => {
        // Área elíptica: `radius` en horizontal y como máximo media línea en vertical
        const d = pointer ? Math.hypot((pointer.x - l.cx) / opts.radius, (pointer.y - l.cy) / l.ry) : Infinity;

        if (d < 1) {
          l.held = true;
          l.leftAt = null;
          l.until = null;
          setOn(l, true, now);
        } else if (l.held) {
          l.held = false;
          l.leftAt = now;
          l.jitter = (Math.random() - 0.5) * 60;
        }

        if (l.on && !l.held) {
          const due = l.until ?? (l.leftAt ?? now) + delayFor(d) + l.jitter;
          if (now >= due) {
            setOn(l, false, now);
            l.leftAt = null;
            l.until = null;
          }
        }

        if (l.on) {
          active = true;
          if (now - l.swapAt >= opts.swapEvery) {
            morphTo(l, randomChar(l.cur), now, opts.swapEvery * 1.2);
            l.swapAt = now;
          }
        } else if (l.settleUntil) {
          active = true;
          if (now >= l.settleUntil) {
            l.settleUntil = 0;
            l.parts = [];
            l.cur = l.ch;
            l.el.style.color = '';
          }
        }
      });

      draw(now);
      if (active) request();
    }

    // Revuelve todo y lo resuelve de izquierda a derecha en `duration` ms
    function decode(duration = opts.touchDuration) {
      const start = performance.now();
      const lead = Math.min(120, duration * 0.2);
      const last = Math.max(1, letters.length - 1);
      letters.forEach((l, i) => {
        l.held = false;
        l.leftAt = null;
        l.until = start + lead + (i / last) * (duration - lead);
        setOn(l, true, start);
      });
      request();
    }

    /* ---------- Eventos ---------- */
    const onPointerMove = (e) => {
      if (e.pointerType === 'touch') return;
      pointer = { x: e.clientX, y: e.clientY };
      request();
    };
    const onPointerOut = (e) => {
      if (e.relatedTarget) return; // solo cuando el cursor sale de la ventana
      pointer = null;
      request();
    };
    const onPointerDown = (e) => {
      if (e.pointerType === 'touch') decode(opts.touchDuration);
    };

    let resizeRaf = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => { measureWidths(); measurePositions(); request(); });
    };
    const onScroll = () => {
      layoutDirtyUntil = performance.now() + 700;
      request();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerout', onPointerOut);
    window.addEventListener('blur', onPointerOut);
    element.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { passive: true });

    if (opts.intro) decode(opts.introDuration);

    return {
      decode,
      destroy() {
        cancelAnimationFrame(raf);
        cancelAnimationFrame(resizeRaf);
        window.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerout', onPointerOut);
        window.removeEventListener('blur', onPointerOut);
        element.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('scroll', onScroll);
        element.innerHTML = originalHTML;
        element.style.position = originalPosition;
        if (!hadLabel) element.removeAttribute('aria-label');
      },
    };
  }

  window.initScramble = initScramble;
})();
