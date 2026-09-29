/* =========================================================
   Text scramble por proximidad del cursor. JavaScript puro, sin dependencias.

   Sin spans ni CSS: se modifica directamente el `nodeValue` de los nodos de texto.
   Cada carácter guarda un `until` (hasta cuándo sigue revuelto); el cursor alarga ese
   tiempo en cada frame mientras esté cerca (aunque no se mueva) y un bucle global de
   requestAnimationFrame escribe los cambios. Al quitarlo, las letras se resuelven dejando estela.

   Uso:
     const scramble = initScramble(el, {
       radius: 0.55,          // radio = max(40px, tamaño de fuente × radius)
       swapEvery: 55,         // ms entre cambios de carácter
       intro: true,           // al montar: aparece revuelto y se decodifica en ~1s
     });
     scramble.decode(600);    // revuelve todo y lo resuelve de izquierda a derecha
     scramble.destroy();      // quita listeners y restaura el texto original

   ========================================================= */
(() => {
  'use strict';

  const DEFAULTS = {
    radius: 0.55,
    minRadius: 40,
    swapEvery: 55,
    letters: 'ABCDEFGHKMNOPRSTUXZ',
    digits: '0123456789',
    touchDuration: 600,
    intro: false,
    introDuration: 1000,
  };

  const isLetter = (ch) => /\p{L}/u.test(ch);

  function initScramble(element, options = {}) {
    const noop = { decode() {}, destroy() {} };
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return noop;

    const opts = { ...DEFAULTS, ...options };
    const letterSet = Array.from(opts.letters);
    const digitSet = Array.from(opts.digits);

    // El nombre accesible no cambia aunque el texto visible se revuelva
    if (!element.hasAttribute('aria-label')) {
      const copy = element.cloneNode(true);
      copy.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
      element.setAttribute('aria-label', copy.textContent.replace(/\s+/g, ' ').trim());
    }

    /* ---------- Nodos de texto y caracteres ---------- */
    const nodes = [];
    const chars = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      node.o = node.nodeValue;
      const entry = { node, value: Array.from(node.o), dirty: false };
      nodes.push(entry);
      // Índice en unidades UTF-16, que es lo que usa Range
      let offset = 0;
      entry.value.forEach((ch, i) => {
        if (!/\s/.test(ch)) {
          chars.push({ entry, i, offset, len: ch.length, ch, x: 0, y: 0, until: 0, swapAt: 0, on: false });
        }
        offset += ch.length;
      });
    }
    if (!chars.length) return noop;

    /* ---------- Medición (coordenadas de página) ---------- */
    const range = document.createRange();
    let radius = opts.minRadius;

    function measure() {
      const sx = window.scrollX;
      const sy = window.scrollY;
      chars.forEach((c) => {
        range.setStart(c.entry.node, c.offset);
        range.setEnd(c.entry.node, c.offset + c.len);
        const r = range.getBoundingClientRect();
        c.x = r.left + r.width / 2 + sx;
        c.y = r.top + r.height / 2 + sy;
      });
      radius = Math.max(opts.minRadius, parseFloat(getComputedStyle(element).fontSize) * opts.radius);
    }
    measure();

    /* ---------- Bucle global ---------- */
    const randomFor = (c) => {
      const set = isLetter(c.ch) ? letterSet : digitSet;
      let out;
      do { out = set[(Math.random() * set.length) | 0]; } while (out === c.ch && set.length > 1);
      return out;
    };

    let raf = 0;
    const request = () => { if (!raf) raf = requestAnimationFrame(tick); };

    // Última posición del cursor (coordenadas de ventana); null si salió de la página
    let pointer = null;

    // Alarga el tiempo revuelto de las letras cerca del cursor. Devuelve si tocó alguna.
    function touch(now) {
      if (!pointer) return false;
      const px = pointer.x + window.scrollX;
      const py = pointer.y + window.scrollY;
      let hit = false;
      chars.forEach((c) => {
        const d = Math.hypot(px - c.x, py - c.y);
        if (d < radius) {
          // Las más cercanas duran revueltas más tiempo: eso genera la estela al quitar el cursor
          c.until = Math.max(c.until, now + 220 + (1 - d / radius) * 380);
          hit = true;
        }
      });
      return hit;
    }

    function tick(now) {
      raf = 0;
      // Mientras el cursor siga encima, las letras siguen cambiando aunque no se mueva
      let active = touch(now);

      chars.forEach((c) => {
        if (now < c.until) {
          active = true;
          // Nunca se muestra el original mientras está activo: cambia cada `swapEvery` ms
          if (!c.on || now - c.swapAt >= opts.swapEvery) {
            c.entry.value[c.i] = randomFor(c);
            c.entry.dirty = true;
            c.swapAt = now;
            c.on = true;
          }
        } else if (c.on) {
          // Vuelve al original de golpe, sin transición
          c.entry.value[c.i] = c.ch;
          c.entry.dirty = true;
          c.on = false;
        }
      });

      // Escritura agrupada: un solo nodeValue por nodo de texto y por frame
      nodes.forEach((entry) => {
        if (!entry.dirty) return;
        entry.node.nodeValue = entry.value.join('');
        entry.dirty = false;
      });

      if (active) request();
    }

    /* ---------- Eventos ---------- */
    const onPointerMove = (e) => {
      if (e.pointerType === 'touch') return;
      pointer = { x: e.clientX, y: e.clientY };
      if (touch(performance.now())) request();
    };
    const onPointerOut = (e) => {
      if (e.relatedTarget) return; // solo cuando el cursor sale de la ventana
      pointer = null;
    };

    // Revuelve todo y lo resuelve de izquierda a derecha en `duration` ms.
    // Cada renglón se descifra al mismo tiempo que los demás (no uno tras otro), así
    // "Sebastian" y "Rodríguez" duran lo mismo. `hold`: ms que todo se queda revuelto antes de empezar.
    function decode(duration = opts.touchDuration, { hold } = {}) {
      measure();
      const now = performance.now();
      const lead = hold ?? Math.min(120, duration * 0.2);
      const lines = new Map();
      chars.forEach((c) => {
        const key = Math.round(c.y / 10);
        if (!lines.has(key)) lines.set(key, []);
        lines.get(key).push(c);
      });
      lines.forEach((line) => {
        const last = Math.max(1, line.length - 1);
        line.forEach((c, i) => { c.until = Math.max(c.until, now + lead + (i / last) * Math.max(0, duration - lead)); });
      });
      request();
    }

    const onPointerDown = (e) => {
      if (e.pointerType === 'touch') decode(opts.touchDuration);
    };

    // Re-medir si cambió el scroll (el hero tiene parallax) o el tamaño de la ventana
    let measureRaf = 0;
    const remeasure = () => {
      if (measureRaf) return;
      measureRaf = requestAnimationFrame(() => { measureRaf = 0; measure(); });
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerout', onPointerOut);
    window.addEventListener('blur', onPointerOut);
    element.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', remeasure, { passive: true });
    window.addEventListener('resize', remeasure);

    if (opts.intro) decode(opts.introDuration);

    return {
      decode,
      destroy() {
        cancelAnimationFrame(raf);
        cancelAnimationFrame(measureRaf);
        window.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerout', onPointerOut);
        window.removeEventListener('blur', onPointerOut);
        element.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('scroll', remeasure);
        window.removeEventListener('resize', remeasure);
        nodes.forEach(({ node }) => { node.nodeValue = node.o; });
      },
    };
  }

  window.initScramble = initScramble;
})();
