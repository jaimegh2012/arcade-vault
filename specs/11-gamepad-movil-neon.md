# 11 — Gamepad móvil estilo neón MK-II

- **Estado:** Aprobado
- **Depende de:** SPEC 10
- **Fecha:** 2026-10-12

**Objetivo:** Rediseñar el mando táctil del reproductor para que luzca como el Gamepad MK-II de `references/gamepad-assets/` (panel de consola neón con cruz de 4 botones y botones A/B redondos), sin cambiar cómo se controla ningún juego.

## Por qué existe este spec

El mando del spec 10 (flechas cian planas + círculos con borde) funciona pero no tiene la identidad visual del sitio. Referencia del usuario: `references/gamepad-assets/gamepad.html` (fuente de verdad de estilos) y `gamepad-neon.png` (captura).

## Alcance

**Incluido:**

1. **Panel (carcasa)** envolviendo cruz y botones, portado de `.gp`: degradado `#1c1c28 → #0c0c14`, borde `rgba(0,245,255,0.18)`, radio 22px (16px en ≤620px), doble borde interior (`::before`), textura de puntos (`::after`), resplandor cian inferior y sombras internas. Sigue **bajo el CRT** (posición actual) y con **el mismo ancho que el CRT** (hereda los `max-width` de `crt-fit`/`crt-tall`), con un ancho mínimo para que el contenido quepa (ver Riesgos).
2. **Cruz** con el aspecto de `.gp-dpad`: 4 teclas cuadradas (`.dp`) con relieve (sombra inferior `0 4px 0`), flecha SVG triangular, y **hub central** con gema cian en rombo (`.dp-hub` / `.dp-hub-gem`). Tamaños de la referencia móvil: teclas 46px, cruz 144px.
   - Estado pulsado = estilo `.dp.on` (baja 3px, borde y brillo cian, flecha con `drop-shadow`).
   - La gema pulsa (2s) como en la referencia; quieta con `prefers-reduced-motion: reduce`.
3. **Botones A/B** con el aspecto de `.ab`: círculos de 64px con relieve, degradado radial, brillo especular, letra en `--pixel` con glow, y anillo discontinuo (`.ab-ring`) visible al pulsar. Orden de la referencia: **B a la izquierda, A a la derecha**. Colores: **A magenta, B cian** (B deja de ser amarillo). Estado pulsado = `.ab.on` (baja 4px, escala 0.97, glow mayor, anillo visible).
   - **Etiqueta de acción debajo** de cada botón (texto `--mono` pequeño, p. ej. "DISPARAR", "ROTAR", "CAÍDA"); dentro del botón solo la letra.
4. **Mando siempre completo**: en los 4 juegos se dibujan las 4 flechas y los botones A y B. Lo que el juego no declara en `GameEntry.touch` se muestra **atenuado** (opacidad baja, sin glow, sin feedback de pulsado) y **no emite** nada al pad. Botones no usados sin etiqueta de acción.
5. **Opacidad**: el mando está fuera del área de juego → opacidad 1 en reposo (se elimina el 0.6 actual).
6. **Interacción sin cambios**: la cruz sigue siendo un único elemento con dirección por ángulo, zona muerta, diagonales (Asteroids) y `setPointerCapture`; las teclas `.dp` son solo visuales (`pointer-events: none`). Botones A/B con su propio pointer (multitáctil). Mismo bloqueo de `contextmenu`, selección y `touch-action`.
7. **Pantalla completa táctil**: recalcular las constantes `100svh - 350px` / `- 300px` de `.av-player:fullscreen` (bloque `@media (pointer: coarse)`) al nuevo alto del panel para que HUD + CRT + panel sigan cabiendo.
8. Pulido visual con `/frontend-design`, tomando los valores de `gamepad.html` como base y los tokens del sitio (`--cyan`, `--magenta`, `--pixel`, `--mono`, `--ink-dim`).

**No incluido:**

- Cambios en `lib/games/touch.ts`, `lib/games/registry.ts`, motores, `input.ts` o canvas: el mapeo de controles del spec 10 se mantiene igual.
- Cambiar la posición del mando o el layout en horizontal (sigue bajo el CRT, con el scroll que ya tenga hoy).
- Mostrar el mando en escritorio, soporte de teclado sobre el mando (el `keydown` de la referencia), estados `:hover`.
- Botón START/SELECT, haptics, sonido, mando configurable.
- Placeholders simulados (sin `touch` → sin mando, como ahora).
- Pruebas automatizadas.

## Modelo de datos

Sin cambios de datos, tipos ni persistencia. `GameEntry.touch` (`dpad`, `diagonals`, `buttons`) se reutiliza tal cual: decide qué está **activo**, ya no qué se **dibuja**.

Archivos:

```
components/touch-pad.tsx   // modificado: marcado del panel, 4 teclas + hub, A/B fijos, estados inactivos, etiquetas debajo
components/game-player.tsx // modificado solo si hace falta pasar la clase de ancho del CRT (crt-fit / crt-tall) al panel
app/globals.css            // modificado: reemplaza el bloque "Mando táctil" (.touch-pad, .tp-*) y ajusta constantes de :fullscreen táctil
```

## Plan de implementación

1. **Marcado** — `touch-pad.tsx`: contenedor panel; cruz con las 4 teclas siempre presentes (SVG de la referencia) + hub con gema; botones B y A siempre presentes con letra dentro y etiqueta debajo; clases `on` (pulsado, desde `downBtns`) y `off` (no declarado en `config`). Los botones `off` no registran handlers. Lógica de `dirsAt`, captura y `releaseAll` intacta.
2. **Estilos del panel** — reemplazar el bloque `/* ===== Mando táctil … */` de `globals.css` por el port de `.gp`, `.gp-body`, `.gp-dpad`, `.dp`, `.dp-hub`, `.ab`, `.ab-ring` con un prefijo que no choque con clases existentes (`.tp-rk`, `.tp-p`, `.tp-s` del salón ya usan `tp-`: usar `tpad-` o similar y verificar con grep).
3. **Ancho** — panel con el ancho del CRT (mismo `crt-fit`/`crt-tall` o `max-width` equivalente) y mínimo para el contenido.
4. **Estados** — pulsado (`.on`), inactivo (`.off`), animación de la gema + `prefers-reduced-motion`.
5. **Pantalla completa** — ajustar las constantes de alto en `@media (pointer: coarse)` del bloque `:fullscreen`.
6. **Pulido** con `/frontend-design`.
7. **Verificación** — Playwright MCP con contexto táctil emulado (`hasTouch`, `isMobile`) vía `browser_run_code_unsafe` en 390×844, 844×390 y tablet, los 4 juegos; capturas en `.playwright-screenshot/` comparadas con `gamepad-neon.png`. Escritorio con ratón: sin mando. `npm run lint`, `npm run build`.

## Criterios de aceptación

- [ ] En táctil, bajo el CRT de los 4 juegos aparece un panel tipo consola (degradado oscuro, borde cian, doble borde interior, textura de puntos, resplandor) del mismo ancho que el CRT.
- [ ] La cruz muestra 4 teclas con relieve, flechas triangulares y hub central con gema cian en rombo que pulsa; con `prefers-reduced-motion: reduce` no pulsa.
- [ ] Los botones son B (cian) a la izquierda y A (magenta) a la derecha, redondos, con relieve y letra pixel con glow; la acción aparece en texto pequeño debajo.
- [ ] Siempre se ven 4 flechas y A+B: en Asteroids `↓` y `B` atenuados; en Arkanoid `↑`, `↓`, `A`, `B` atenuados; en Snake `A` y `B` atenuados; en Tetris todo activo. Tocar un control atenuado no hace nada.
- [ ] Pulsar una dirección activa o un botón activo muestra el estado pulsado de la referencia (hundido + brillo; anillo discontinuo en A/B) y se apaga al soltar, pausar, abrir el modal o reiniciar.
- [ ] Los controles de los 4 juegos funcionan exactamente igual que con el spec 10 (diagonales en Asteroids, deslizar entre direcciones, multitáctil, repetición en Tetris).
- [ ] 390×844: HUD + CRT + panel caben sin scroll horizontal y el panel no se recorta. Tetris (CRT estrecho) incluido.
- [ ] Pantalla completa en táctil (Android): HUD, CRT y panel visibles sin scroll.
- [ ] Escritorio con ratón: no aparece el mando y nada cambia.
- [ ] `npm run lint` y `npm run build` pasan.

## Decisiones tomadas y descartadas

- **Sí:** panel/carcasa completo de la referencia. **No:** solo reestilar cruz y botones sueltos.
- **Sí:** mando siempre completo (4 flechas + A/B) con lo no usado atenuado e inerte → mismo aspecto en todos los juegos. **No:** dibujar solo lo declarado (decisión del spec 10, revertida aquí solo en lo visual).
- **Sí:** letra dentro del botón y acción debajo. **No:** solo letra (se pierde qué hace cada botón); letra + acción dentro (no se parece a la referencia).
- **Sí:** colores de la referencia, A magenta y B cian. **No:** mantener B amarillo.
- **Sí:** panel del ancho del CRT. **No:** ancho fijo 460px.
- **Sí:** gema con pulso, respetando `prefers-reduced-motion`. **No:** gema estática.
- **Sí:** mantener el mando bajo el CRT también en horizontal. **No:** partirlo a los lados del CRT ni encoger el CRT (fuera de alcance).
- **Sí:** cruz como un único elemento por ángulo (spec 10); las 4 teclas son visuales. **No:** 4 botones independientes como en la referencia (rompería deslizar entre direcciones y diagonales).
- **Sí:** opacidad 1 (ya no tapa el juego). **No:** semitransparencia del spec 10.

## Riesgos identificados

| Riesgo                                                                        | Mitigación                                                                                                                     |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Tetris tiene un CRT estrecho (~300px) y cruz 144px + A/B 64px no caben        | Ancho mínimo del panel (~340px, sin pasar del viewport) y tamaños reducidos (teclas ~42px, A/B ~56px) por debajo de ese ancho. |
| Colisión de clases: `.tp-rk/.tp-p/.tp-s` ya existen en el salón               | Prefijo nuevo y grep antes de escribir CSS.                                                                                    |
| El panel es más alto que el mando actual → en vertical HUD+CRT+panel no caben | Verificar en 390×844; reducir padding del panel en `(orientation: portrait)` si hace falta.                                    |
| Fullscreen táctil con constantes mal calculadas → scroll o CRT diminuto       | Recalcular con el alto real del panel y verificar en captura.                                                                  |
| Controles atenuados confunden ("¿por qué no funciona?")                       | Contraste claramente apagado y sin feedback de pulsado; aceptado como decisión del usuario.                                    |
| El `translateY` al pulsar saca el elemento de la captura del pointer          | Las teclas son visuales; la captura vive en el contenedor de la cruz, que no se mueve.                                         |

## Qué **no** está en este spec

- Cambios de mapeo, motores o registro.
- Reubicar el mando (lados del CRT, superpuesto) o rediseño landscape.
- Mando en escritorio, hover, teclado sobre el mando.
- START/SELECT, haptics, sonido, configuración.
- Pruebas automatizadas.
