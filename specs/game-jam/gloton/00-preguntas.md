# GLOTÓN — preguntas abiertas de la jam

- **Fecha:** 2026-10-12
- Cada duda está **ya resuelta por defecto** dentro de los tres specs: ninguna queda como TODO. Aquí se anota la pregunta, el valor por defecto aplicado y qué habría que cambiar si la respuesta es otra.

## 1. Tamaño de celda y, por tanto, del canvas

- **Pregunta:** ¿`CELL = 20` px (canvas 560×620) o una celda más pequeña, `CELL = 16` (448×496), para que el marco CRT quepa mejor en pantallas bajas?
- **Por defecto aplicado:** `CELL = 20` → **560×620**, `aspect: "28 / 31"`, con regla nueva `.crt-tall:has(.crt-screen[style*="28 / 31"])` en `app/globals.css` (precedente de Snake con 17/15).
- **Si la respuesta es otra:** cambia `CELL` en `constants.ts`, el canvas lógico y las velocidades en px/s de las **tres** variantes (secciones `## Alcance` → Geometría y Movimiento, y `## Modelo de datos`). El `aspect` no cambia: 28/31 es independiente de la celda.

## 2. Diseño del laberinto: propio o calco del clásico

- **Pregunta:** ¿Trazado propio dibujado a mano en `levels.ts`, o réplica celda a celda del laberinto original?
- **Por defecto aplicado:** trazado **propio** de 28×31, simétrico, con exactamente 240 puntos y 4 píldoras verificados por código en el paso de implementación (en C, dos trazados: `MAZE_A` y `MAZE_B`).
- **Si la respuesta es otra:** cambia `levels.ts` y los recuentos de comestibles de la variante elegida (`## Alcance` → Geometría, `## Plan de implementación` paso 3, criterios de aceptación de recuento). El techo de puntuación cambia si el recuento deja de ser 240 + 4.

## 3. Nivel del HUD en las variantes de un solo laberinto (A y B)

- **Pregunta:** con un único laberinto, ¿`engineLevel: false` (el HUD muestra el nivel **derivado** `floor(score / 2500) + 1`) o se oculta el campo NIVEL ampliando `game-player.tsx`?
- **Por defecto aplicado:** `engineLevel: false` y se acepta el nivel derivado, exactamente como decidió `specs/09-juego-snake.md`. En C no aplica: `engineLevel: true` con niveles 01–05 reales.
- **Si la respuesta es otra:** A y B, sección `## Alcance` punto 5 y entrada del registro; además habría que ampliar el contrato con algo tipo `hasLevel?: boolean` y tocar `game-player.tsx`, lo que hoy está fuera de alcance en ambas.

## 4. Audio en las variantes A y B

- **Pregunta:** ¿se añade sonido a A o B, aunque sea mínimo?
- **Por defecto aplicado:** **no**. A y B van sin audio y sin chip `SONIDO` (precedente de Snake). El audio es uno de los rasgos que define a C, allí sintetizado con Web Audio API.
- **Si la respuesta es otra:** A o B tendrían que incorporar `audio.ts`, `hasSound: true` y las props `muted`/`volume` (que ya existen desde el SPEC 08), más sus criterios de aceptación de sonido; el riesgo y el esfuerzo de esa variante suben y deja de ser «la mínima».

## 5. Frutas en A y B

- **Pregunta:** ¿se incluyen frutas de bonus en A o B?
- **Por defecto aplicado:** **no**. Sólo C tiene frutas (100 / 300 / 500 / 700 / 1000 por nivel).
- **Si la respuesta es otra:** cambia la fórmula de puntuación, el techo alcanzable y el texto `long` de la variante afectada (`## Alcance`, `## Modelo de datos` y criterios de aceptación de puntuación).

## 6. El campo de HUD nuevo de B: `CADENA` en React o anillo en canvas

- **Pregunta:** ¿el valor de la cadena va al HUD React (ampliando el contrato con `hasChain`/`onChain`) o se dibuja en canvas como todo lo demás del twist?
- **Por defecto aplicado:** al **HUD React**, con el par `hasChain`/`onChain` calcado de `hasLines`/`onLines` del SPEC 07 — es el único campo de HUD nuevo que B se permite. El **eco restante** sí se dibuja en canvas, como anillo alrededor del glotón, porque es información espacial.
- **Si la respuesta es otra:** B deja de modificar `lib/games/types.ts`, `lib/games/registry.ts` y `components/game-player.tsx` (su `## Alcance` punto 5, el `## Modelo de datos` y el bloque de archivos), y la cadena pasa a dibujarse junto al anillo de eco.

## 7. Techo de la cadena de B

- **Pregunta:** ¿tope de 12 800 por espectro (techo teórico 143 200) o cadena sin tope?
- **Por defecto aplicado:** tope **12 800** desde el 7.º espectro del mismo eco; techo teórico **143 200**, con cuatro órdenes de magnitud de margen bajo el `CHECK` de `scores` (0–9 999 999).
- **Si la respuesta es otra:** B, `## Alcance` → Puntuación, `CHAIN_VALUES` en `## Modelo de datos` y el criterio de aceptación de la secuencia de valores. Sin tope habría que recalcular el techo y demostrar que sigue cabiendo en el `CHECK`.

## 8. Número de niveles y trazados de C

- **Pregunta:** ¿5 niveles sobre 2 trazados (`A`, `A`, `B`, `B`, `A`), u otra combinación?
- **Por defecto aplicado:** **5 niveles, 2 trazados**, con velocidades e inversión por tabla en `levels.ts` y `levelJump: 5` (mismo número de chips que Arkanoid).
- **Si la respuesta es otra:** C, tabla de niveles de `## Alcance`, `levelJump` del `GameEntry`, el techo de puntuación por nivel y el total (hoy 103 200), y los criterios de aceptación de progresión.

## 9. Farmeo de puntos con el salto de nivel en C

- **Pregunta:** ¿se acepta que los chips `1`–`5` del overlay de pausa permitan repetir un nivel y acumular el bonus de nivel limpio?
- **Por defecto aplicado:** **se acepta y se declara**, igual que en `specs/08-juego-arkanoid.md`; el anti-trampas queda para el spec de Auth y el `CHECK` 0–9 999 999 acota el daño.
- **Si la respuesta es otra:** C tendría que cobrar el bonus una sola vez por nivel y partida, o no ofrecer `levelJump`; afecta a `## Alcance` punto 5, a la puntuación y a su tabla de riesgos.

## 10. Controles táctiles

- **Pregunta:** ¿swipe o cruceta en pantalla para jugar en móvil?
- **Por defecto aplicado:** **no**, en las tres variantes (como en los cuatro juegos ya implementados). El canvas sí escala en móvil, pero el juego se maneja con teclado.
- **Si la respuesta es otra:** afecta a `## Alcance` punto 6, a `input.ts` y a los criterios de controles de la variante elegida; conviene un spec aparte de controles táctiles para todo el catálogo, no uno por juego.

## 11. Snapshot del catálogo

- **Pregunta:** ¿hay que actualizar `references/catalogo-juegos.md` (fechado 2026-10-06) al implementar la variante elegida?
- **Por defecto aplicado:** las tres variantes **no** lo incluyen en su alcance; ninguno de los specs 07/08/09 lo actualizó tampoco.
- **Si la respuesta es otra:** añadir el snapshot al paso de cierre de la variante elegida, junto a `get_advisors`, `npm run lint` y `npm run build`.
