# Portafolio — Sebastian Rodríguez (cvz-dev)

Sitio estático en HTML, CSS y JavaScript puros. Sin build ni dependencias de npm.

## Estructura

```
index.html          Página única
css/styles.css      Estilos (tokens en :root, responsive al final)
css/lenis.css       Estilos base de Lenis
js/main.js          Interacciones y animaciones
js/terminal.js      Terminal interactiva del hero (el contenido de los comandos está en DATA, al inicio)
js/scramble.js      Efecto de letras revueltas en el nombre
js/regresion.js     Regresión lineal interactiva de la tarjeta del artículo
js/vendor/          GSAP 3.15 (+ ScrollTrigger, SplitText) y Lenis 1.3, copiados en local
assets/             Cursor SVG, favicon y PDFs (assets/docs)
netlify.toml        Configuración de despliegue
```

## Probar en local

```bash
python3 -m http.server 5173
# abrir http://localhost:5173
```

## Animaciones

- **CSS:** luces de puntos, giros, parpadeos, hovers y la luz que sigue al cursor en las tarjetas.
- **GSAP:**
  - Entrada del hero; al terminar, la terminal escribe `whoami` y `ahora` sola.
  - Aparición de secciones al hacer scroll (ScrollTrigger).
  - Títulos por líneas y "Sobre mí" palabra por palabra (SplitText).
  - Cinta de temas que reacciona a la velocidad del scroll.
  - Botones magnéticos e inclinación 3D del panel (la terminal tiene la suya, más suave).
- **Lenis:** scroll suave sincronizado con ScrollTrigger.

Con "reducir movimiento" activado, o si GSAP no carga, la página se muestra completa y estática.

## Desplegar en Netlify

Arrastra la carpeta a app.netlify.com/drop, o conecta el repositorio. No hay comando de build.
