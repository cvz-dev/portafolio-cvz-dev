/* =========================================================
   Terminal interactiva del hero. JavaScript puro, sin dependencias.

   Uso:
     const term = initTerminal(document.querySelector('[data-term]'), {
       scrollTo(el) {},       // scroll suave a una sección (opcional; si no, usa window.scrollTo)
       copyEmail() {},        // copia el correo y muestra el toast de la página
       scramble() {},         // revuelve el nombre del hero
     });
     term.boot();             // escribe los comandos de bienvenida (llamar al terminar la intro)
   ========================================================= */
(() => {
  'use strict';

  /* ---------- Contenido: edítalo aquí ---------- */
  const DATA = {
    nombre: 'Sebastian Rodríguez Arellano',
    areas: 'IA · desarrollo · automatización',
    sobre: [
      'Me interesa convertir procesos manuales en sistemas',
      'que trabajan solos: desde recolectar y entender',
      'información con IA hasta plataformas de uso diario.',
    ],
    ahora: {
      estado: 'servicio social',
      proyecto: 'Plataforma de seguimiento de protocolos de investigación.',
    },
    proyectos: [
      ['Anáhuac × Banorte', 'noticias con IA · embeddings'],
      ['Protocolos', 'plataforma web · servicio social'],
      ['Concurso IA UNAM', 'ganador · en equipo'],
      ['Artículo', 'regresión lineal'],
    ],
    stack: [
      ['lenguajes', '[LENGUAJE] · [LENGUAJE]'],
      ['frameworks', '[FRAMEWORK]'],
      ['ia', '[LIBRERÍA IA] · embeddings'],
      ['datos', '[BASE DE DATOS]'],
      ['automatización', '[AUTOMATIZACIÓN] · web scraping'],
    ],
    github: 'github.com/cvz-dev',
    linkedin: 'linkedin.com/in/sebastian-rodriguez-a-dev',
  };

  // Secciones a las que puede ir `ir <sección>`, con sus alias
  const SECCIONES = {
    inicio: 'inicio',
    sobre: 'sobre-mi',
    proyectos: 'proyectos',
    publicacion: 'publicacion',
    stack: 'stack',
    certificados: 'certificados',
    contacto: 'contacto',
  };
  const ALIAS_SECCION = { articulo: 'publicacion', 'artículo': 'publicacion', herramientas: 'stack', 'sobre-mi': 'sobre' };

  const MAX_LINES = 200;
  const PROMPT = 'sebastian:~$';

  function initTerminal(root, options = {}) {
    if (!root) return { boot() {} };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const body = root.querySelector('[data-term-body]');
    const log = root.querySelector('[data-term-log]');
    const input = root.querySelector('[data-term-input]');
    const segs = Array.from(root.querySelectorAll('[data-term-segs] i'));
    const caret = root.querySelector('[data-term-caret]');

    /* ---------- Salida ---------- */
    // Cada línea es una lista de trozos [texto, tono]; tonos: txt, hi, dim, acc
    let lineCount = 0;

    function print(...parts) {
      const line = document.createElement('div');
      line.className = 'term-l';
      parts.forEach((p) => {
        const [text, tone] = typeof p === 'string' ? [p, 'txt'] : p;
        const span = document.createElement('span');
        span.className = `t-${tone}`;
        span.textContent = text;
        line.appendChild(span);
      });
      log.appendChild(line);
      while (log.childElementCount > MAX_LINES) log.firstElementChild.remove();
      lineCount++;
    }
    const blank = () => print('');
    const echoCommand = (cmd) => print([`${PROMPT} `, 'acc'], [cmd, 'hi']);

    // Autoscroll al fondo cada vez que cambia el número de líneas
    let lastCount = 0;
    const autoscroll = () => {
      if (lineCount === lastCount) return;
      lastCount = lineCount;
      body.scrollTop = body.scrollHeight;
    };

    const pad = (s, n) => s + ' '.repeat(Math.max(1, n - s.length));

    /* ---------- Comandos ---------- */
    const COMMANDS = {
      help: {
        desc: 'esta lista',
        run() {
          print(['comandos disponibles', 'hi']);
          Object.entries(COMMANDS).forEach(([name, c]) => {
            if (c.hidden) return;
            print(['  ' + pad(c.usage || name, 15), 'txt'], [c.desc, 'dim']);
          });
        },
      },
      whoami: {
        desc: 'quién soy',
        run() {
          print([DATA.nombre, 'hi']);
          print([DATA.areas, 'dim']);
        },
      },
      sobre: {
        desc: 'resumen',
        run() { DATA.sobre.forEach((l) => print(l)); },
      },
      ahora: {
        desc: 'en qué estoy ahora',
        run() {
          print(['● ', 'acc'], [DATA.ahora.estado, 'hi']);
          print(DATA.ahora.proyecto);
        },
      },
      proyectos: {
        desc: 'proyectos destacados',
        usage: 'proyectos (ls)',
        run() {
          const w = Math.max(...DATA.proyectos.map(([n]) => n.length)) + 2;
          DATA.proyectos.forEach(([name, desc], i) => {
            print([String(i + 1).padStart(2, '0') + '  ', 'dim'], [pad(name, w), 'hi'], [desc, 'dim']);
          });
          print(['→ ir proyectos', 'dim']);
        },
      },
      stack: {
        desc: 'herramientas',
        run() {
          const w = Math.max(...DATA.stack.map(([c]) => c.length)) + 2;
          DATA.stack.forEach(([cat, tools]) => print([pad(cat, w), 'dim'], [tools, 'txt']));
        },
      },
      contacto: {
        desc: 'correo y redes',
        run() {
          print([pad('correo', 10), 'dim'], [emailAddress(), 'hi']);
          print([pad('github', 10), 'dim'], DATA.github);
          print([pad('linkedin', 10), 'dim'], DATA.linkedin);
        },
      },
      correo: {
        desc: 'copia mi correo',
        async run() {
          const ok = options.copyEmail
            ? await options.copyEmail()
            : await navigator.clipboard.writeText(emailAddress()).then(() => true, () => false);
          if (ok) print(['correo copiado: ', 'dim'], [emailAddress(), 'hi']);
          else print(['no se pudo copiar. escríbelo a mano: ', 'acc'], [emailAddress(), 'hi']);
        },
      },
      ir: {
        desc: 'ir a una sección (cd)',
        usage: 'ir <sección>',
        run(args) {
          const raw = (args[0] || '').toLowerCase();
          const key = ALIAS_SECCION[raw] || raw;
          const target = SECCIONES[key] && document.getElementById(SECCIONES[key]);
          if (!raw || !target) {
            if (raw) print(['sección no encontrada: ' + raw, 'acc']);
            print(['secciones: ', 'dim'], Object.keys(SECCIONES).join(' · '));
            return;
          }
          print(['→ ' + key, 'dim']);
          if (options.scrollTo) options.scrollTo(target);
          else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' });
        },
      },
      scramble: {
        desc: 'revuelve mi nombre',
        run() {
          if (options.scramble) options.scramble();
          print(['revolviendo…', 'dim']);
        },
      },
      fecha: {
        desc: 'fecha y hora en CDMX',
        run() {
          print(new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }), [' · CDMX', 'dim']);
        },
      },
      echo: {
        desc: 'repite el texto',
        usage: 'echo <texto>',
        run(args, rest) { print(rest); },
      },
      sudo: {
        desc: 'permisos de administrador',
        run() { print(['permiso denegado. ', 'acc'], 'pero puedes contratarme → ', ['contacto', 'hi']); },
      },
      clear: {
        desc: 'limpia la terminal (cls)',
        run() { clear(); },
      },
    };
    const ALIAS = { ls: 'proyectos', cd: 'ir', cls: 'clear' };

    function clear() {
      log.replaceChildren();
      lineCount++;
    }

    function emailAddress() {
      const el = document.querySelector('[data-email]');
      return (el && el.dataset.email) || '[TU CORREO]';
    }

    const history = [];
    let historyIndex = 0;

    function run(raw, { record = true } = {}) {
      const line = raw.trim();
      echoCommand(line);
      if (line && record) {
        if (history[history.length - 1] !== line) history.push(line);
        historyIndex = history.length;
      }
      if (!line) { autoscroll(); return; }
      const [head, ...args] = line.split(/\s+/);
      const name = ALIAS[head.toLowerCase()] || head.toLowerCase();
      const cmd = COMMANDS[name];
      // Línea en blanco después de cada salida (también de las asíncronas, como `correo`)
      const done = () => { if (name !== 'clear') blank(); autoscroll(); };
      if (!cmd) {
        print(['comando no encontrado: ' + head, 'acc']);
        print(["escribe 'help'", 'dim']);
        done();
      } else {
        Promise.resolve(cmd.run(args, line.slice(head.length).trim())).then(done);
      }
    }

    /* ---------- Autocompletado con Tab ---------- */
    function complete() {
      const value = input.value;
      const parts = value.split(/\s+/);
      let pool;
      let prefix;
      if (parts.length <= 1) {
        pool = [...Object.keys(COMMANDS), ...Object.keys(ALIAS)];
        prefix = parts[0].toLowerCase();
      } else if (['ir', 'cd'].includes(parts[0].toLowerCase()) && parts.length === 2) {
        pool = [...Object.keys(SECCIONES), ...Object.keys(ALIAS_SECCION)];
        prefix = parts[1].toLowerCase();
      } else {
        return;
      }
      const matches = [...new Set(pool)].filter((c) => c.startsWith(prefix)).sort();
      if (matches.length === 1) {
        parts[parts.length - 1] = matches[0];
        input.value = parts.join(' ') + ' ';
      } else if (matches.length > 1) {
        echoCommand(value);
        print([matches.join('  '), 'dim']);
        autoscroll();
      }
    }

    /* ---------- Cursor propio (.term-caret) ---------- */
    // Fuente monoespaciada: la posición del cursor es su índice en `ch`
    let typingTimer = 0;
    function updateCaret() {
      if (!caret) return;
      const pos = document.activeElement === input && input.selectionStart != null
        ? input.selectionStart
        : input.value.length;
      caret.style.setProperty('--caret-x', `calc(${pos}ch - ${input.scrollLeft}px)`);
      // Fijo mientras escribes, parpadea cuando te detienes
      caret.classList.add('is-typing');
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => caret.classList.remove('is-typing'), 500);
    }
    // El valor también cambia por código (historial, autocompletado, intro): se intercepta el setter
    const valueDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    Object.defineProperty(input, 'value', {
      get() { return valueDesc.get.call(this); },
      set(v) { valueDesc.set.call(this, v); requestAnimationFrame(updateCaret); },
    });
    ['input', 'keyup', 'click', 'focus', 'blur', 'select'].forEach((type) => input.addEventListener(type, updateCaret));
    document.addEventListener('selectionchange', () => { if (document.activeElement === input) updateCaret(); });

    /* ---------- Teclado ---------- */
    input.addEventListener('keydown', (e) => {
      cancelBoot(true);
      if (e.key === 'Enter') {
        e.preventDefault();
        const value = input.value;
        input.value = '';
        run(value);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!history.length) return;
        historyIndex = Math.max(0, historyIndex - 1);
        input.value = history[historyIndex];
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        historyIndex = Math.min(history.length, historyIndex + 1);
        input.value = history[historyIndex] || '';
      } else if (e.key === 'Tab') {
        e.preventDefault();
        complete();
      } else if (e.key.toLowerCase() === 'l' && e.ctrlKey) {
        e.preventDefault();
        clear();
      }
    });

    // Clic en cualquier parte del cuerpo: enfoca el input, salvo que haya texto seleccionado
    body.addEventListener('click', () => {
      const sel = window.getSelection();
      if (sel && sel.toString()) return;
      input.focus({ preventScroll: true });
    });

    /* ---------- Barra de comandos rápidos ---------- */
    root.querySelectorAll('[data-cmd]').forEach((btn) => {
      btn.addEventListener('click', () => {
        cancelBoot(true);
        run(btn.dataset.cmd);
      });
    });

    /* ---------- Boot automático ---------- */
    let bootTimers = [];
    let booting = false;
    let interacted = false; // si la persona ya usó la terminal, el boot no arranca
    const later = (fn, ms) => { bootTimers.push(setTimeout(fn, ms)); };

    function cancelBoot(clearInput) {
      interacted = true;
      if (!booting) return;
      booting = false;
      bootTimers.forEach(clearTimeout);
      bootTimers = [];
      if (clearInput) input.value = '';
    }

    function boot() {
      if (booting || interacted) return;
      const commands = ['whoami', 'ahora'];
      const finish = () => {
        booting = false;
        print(["escribe 'help' o toca un comando ↓", 'dim']);
        autoscroll();
      };
      if (reduceMotion) {
        commands.forEach((c) => run(c, { record: false }));
        finish();
        return;
      }
      booting = true;
      const typeCommand = (i) => {
        if (i >= commands.length) { finish(); return; }
        const cmd = commands[i];
        let n = 0;
        const typeChar = () => {
          n++;
          input.value = cmd.slice(0, n);
          if (n < cmd.length) later(typeChar, 55 + Math.random() * 60);
          else {
            later(() => {
              input.value = '';
              run(cmd, { record: false });
              later(() => typeCommand(i + 1), 650);
            }, 280);
          }
        };
        later(typeChar, 55 + Math.random() * 60);
      };
      later(() => typeCommand(0), 900);
    }

    /* ---------- Movimiento: flotar, inclinarse con el cursor y segmentos ---------- */
    // La inclinación 3D solo se aplica mientras el cursor se mueve: al quedarse quieto,
    // la terminal vuelve a plano y el navegador redibuja el texto nítido (también con zoom).
    const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
    const IDLE_MS = 900;
    let lastMove = -Infinity;
    let depth = 0;  // 0 = plano, 1 = inclinación completa
    let visible = true;
    let raf = 0;

    if (!reduceMotion) {
      window.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        const r = root.getBoundingClientRect();
        const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
        const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
        tilt.ty = nx * 3;     // rotateY ±3°
        tilt.tx = -ny * 2.5;  // rotateX ±2.5°
        lastMove = performance.now();
      }, { passive: true });

      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(frame);
      }).observe(root);
    }

    // Segmentos del header: barrido, respiración y parpadeo, en ciclo
    const PATTERNS = [
      (step) => segs.map((_, i) => (i === step % 8 || i === (step - 1) % 8 ? 1 : 0.12)),
      (step) => { const v = 0.2 + 0.8 * (0.5 - 0.5 * Math.cos((step / 12) * Math.PI * 2)); return segs.map(() => v); },
      (step) => segs.map((_, i) => ((step + i) % 3 === 0 && Math.random() > 0.3 ? 1 : 0.12)),
    ];
    let segStep = 0;
    let segAt = 0;

    function paintSegments(now) {
      if (now - segAt < 110) return;
      segAt = now;
      segStep++;
      const pattern = PATTERNS[Math.floor(segStep / 24) % PATTERNS.length];
      pattern(segStep).forEach((v, i) => { segs[i].style.opacity = v.toFixed(2); });
    }

    function frame(now) {
      raf = 0;
      if (!visible) return;
      tilt.x += (tilt.tx - tilt.x) * 0.08;
      tilt.y += (tilt.ty - tilt.y) * 0.08;
      depth += ((now - lastMove < IDLE_MS ? 1 : 0) - depth) * 0.06;
      // Flotación ajustada a píxeles físicos: con medios píxeles los bordes de 1px
      // (las píldoras de comandos) se reparten entre dos filas y se ven cortados por momentos
      const dpr = window.devicePixelRatio || 1;
      const float = Math.round(Math.sin(now / 1400) * 6 * dpr) / dpr;
      const rx = tilt.x * depth;
      const ry = tilt.y * depth;
      root.style.transform = Math.abs(rx) + Math.abs(ry) < 0.01
        ? `translateY(${float.toFixed(2)}px)`
        : `perspective(1200px) translateY(${float.toFixed(2)}px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg)`;
      // El reflejo (.term-glare) se desliza con el cursor
      root.style.setProperty('--gx', `${(50 + (tilt.y / 3) * 30).toFixed(1)}%`);
      root.style.setProperty('--gy', `${(40 - (tilt.x / 2.5) * 25).toFixed(1)}%`);
      paintSegments(now);
      autoscroll();
      raf = requestAnimationFrame(frame);
    }

    if (reduceMotion) segs.forEach((s, i) => { s.style.opacity = i < 3 ? '1' : '0.12'; });
    else raf = requestAnimationFrame(frame);

    return { boot, run };
  }

  window.initTerminal = initTerminal;
})();
