/* =========================================================
   Regresión lineal interactiva (tarjeta del artículo). JavaScript puro, sin dependencias.

   Uso:
     initRegression(document.querySelector('[data-regression]'), { reduceMotion: false });

   Clic en la gráfica: añade un punto y se recalcula el modelo por mínimos cuadrados.
   El modelo se muestra en escala 0–10 en ambos ejes (la pendiente no cambia, b se multiplica por 10).
   ========================================================= */
(() => {
  'use strict';

  const PAD = { top: 20, right: 20, bottom: 44, left: 20 }; // abajo queda espacio para la nota y los botones
  const GRID = 16;           // separación de la cuadrícula de puntos
  const POP_MS = 500;        // aparición de cada punto
  const LERP = 0.08;         // la recta se acerca a su valor nuevo en cada fotograma

  // Mínimos cuadrados ordinarios sobre coordenadas normalizadas (0–1, y hacia arriba)
  function fit(points) {
    const n = points.length;
    if (n < 2) return null;
    const mx = points.reduce((s, p) => s + p.x, 0) / n;
    const my = points.reduce((s, p) => s + p.y, 0) / n;
    let sxy = 0, sxx = 0;
    points.forEach((p) => { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; });
    const m = sxx === 0 ? 0 : sxy / sxx;
    const b = my - m * mx;
    let ssRes = 0, ssTot = 0;
    points.forEach((p) => { ssRes += (p.y - (m * p.x + b)) ** 2; ssTot += (p.y - my) ** 2; });
    return { m, b, r2: ssTot === 0 ? 1 : 1 - ssRes / ssTot };
  }

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const sign = (v) => (v < 0 ? '−' : '+');

  window.initRegression = function initRegression(root, opts = {}) {
    const canvas = root.querySelector('canvas');
    const eqEl = root.querySelector('[data-reg-eq]');
    const r2El = root.querySelector('[data-reg-r2]');
    const nEl = root.querySelector('[data-reg-n]');
    const ctx = canvas.getContext('2d');
    const reduceMotion = !!opts.reduceMotion;

    const styles = getComputedStyle(root);
    const accent = styles.getPropertyValue('--accent').trim() || '#53A3EA';
    const [ar, ag, ab] = accent.replace('#', '').match(/../g).map((h) => parseInt(h, 16));
    const residual = `rgba(${ar}, ${ag}, ${ab}, .3)`;

    let points = [];
    let target = null;       // modelo calculado
    let line = null;         // recta dibujada (se interpola hacia target)
    let W = 0, H = 0, dpr = 1;
    let raf = 0;
    let visible = false;

    /* ---------- Coordenadas ---------- */
    const toPx = (x, y) => [
      PAD.left + x * (W - PAD.left - PAD.right),
      H - PAD.bottom - y * (H - PAD.top - PAD.bottom),
    ];
    const fromPx = (px, py) => [
      (px - PAD.left) / (W - PAD.left - PAD.right),
      (H - PAD.bottom - py) / (H - PAD.top - PAD.bottom),
    ];

    /* ---------- Lecturas del modelo ---------- */
    function updateReadout() {
      nEl.textContent = points.length;
      if (!target) {
        eqEl.textContent = 'y = —';
        r2El.textContent = '—';
        return;
      }
      const b = target.b * 10;
      eqEl.textContent = `y = ${target.m.toFixed(2).replace('-', '−')}x ${sign(b)} ${Math.abs(b).toFixed(2)}`;
      r2El.textContent = target.r2.toFixed(3).replace('-', '−');
    }

    function refit() {
      target = fit(points);
      if (!target) line = null;
      else if (reduceMotion) line = { m: target.m, b: target.b };
      else if (!line) line = { m: 0, b: target.m * 0.5 + target.b }; // entra plana y gira hasta su pendiente
      updateReadout();
      wake();
    }

    /* ---------- Dibujo ---------- */
    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      draw(performance.now());
    }

    function draw(now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Cuadrícula de puntos
      ctx.fillStyle = 'rgba(255, 255, 255, .07)';
      for (let x = GRID / 2; x < W; x += GRID) {
        for (let y = GRID / 2; y < H; y += GRID) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Residuales: del punto a la recta
      if (line) {
        ctx.strokeStyle = residual;
        ctx.lineWidth = 1;
        points.forEach((p) => {
          if (p.born > now) return;
          const [px, py] = toPx(p.x, p.y);
          const [, ly] = toPx(p.x, line.m * p.x + line.b);
          ctx.beginPath();
          ctx.moveTo(Math.round(px) + 0.5, py);
          ctx.lineTo(Math.round(px) + 0.5, ly);
          ctx.stroke();
        });

        // Recta de regresión con brillo
        const [x0, y0] = toPx(0, line.b);
        const [x1, y1] = toPx(1, line.m + line.b);
        ctx.save();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.shadowColor = accent;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.restore();
      }

      // Puntos: aparecen grandes y tenues y se asientan
      let popping = false;
      ctx.save();
      ctx.fillStyle = '#E6E6E6';
      ctx.shadowColor = 'rgba(255, 255, 255, .6)';
      ctx.shadowBlur = 8;
      points.forEach((p) => {
        const t = reduceMotion ? 1 : Math.min(1, (now - p.born) / POP_MS);
        if (t < 1) popping = true;
        if (t < 0) return; // aún no le toca aparecer
        const k = easeOutCubic(t);
        const [px, py] = toPx(p.x, p.y);
        ctx.globalAlpha = 0.35 + 0.65 * k;
        ctx.beginPath();
        ctx.arc(px, py, 9.5 - 6 * k, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
      return popping;
    }

    // Bucle de animación: solo corre mientras hay algo moviéndose y la tarjeta está en pantalla
    function tick(now) {
      raf = 0;
      let moving = false;
      if (line && target) {
        line.m += (target.m - line.m) * LERP;
        line.b += (target.b - line.b) * LERP;
        moving = Math.abs(target.m - line.m) > 1e-4 || Math.abs(target.b - line.b) > 1e-4;
        if (!moving) { line.m = target.m; line.b = target.b; }
      }
      const popping = draw(now);
      if ((moving || popping) && visible) raf = requestAnimationFrame(tick);
    }

    function wake() {
      if (!raf && visible) raf = requestAnimationFrame(tick);
      else if (!visible) draw(performance.now());
    }

    /* ---------- Datos ---------- */
    function addPoint(x, y, delay = 0) {
      points.push({ x, y, born: performance.now() + delay });
    }

    // ~14 puntos alrededor de una recta al azar, con ruido
    function randomize() {
      points = [];
      const m = 0.3 + Math.random() * 0.6;
      const b = 0.08 + Math.random() * (0.84 - m) * 0.9;
      const noise = 0.06 + Math.random() * 0.1;
      for (let i = 0; i < 14; i++) {
        const x = 0.04 + (i / 13) * 0.92 + (Math.random() - 0.5) * 0.05;
        const y = m * x + b + (Math.random() + Math.random() - 1) * noise * 2;
        addPoint(Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y)), reduceMotion ? 0 : i * 45);
      }
      refit();
    }

    function clear() {
      points = [];
      refit();
    }

    /* ---------- Eventos ---------- */
    canvas.addEventListener('click', (e) => {
      const r = canvas.getBoundingClientRect();
      const [x, y] = fromPx(e.clientX - r.left, e.clientY - r.top);
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      addPoint(x, y);
      refit();
    });
    root.querySelector('[data-reg-random]').addEventListener('click', randomize);
    root.querySelector('[data-reg-clear]').addEventListener('click', clear);

    new ResizeObserver(resize).observe(canvas);

    // Pausa el bucle fuera de pantalla; la primera vez que se ve, llegan los puntos iniciales
    let seeded = false;
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !seeded) {
        seeded = true;
        randomize();
      } else if (visible) wake();
    }, { threshold: 0.35 }).observe(canvas);

    updateReadout();
    return { randomize, clear };
  };
})();
