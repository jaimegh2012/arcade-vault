# Juegos sugeridos — memoria de `game-planner`

Registro **append-only**. El agente `game-planner` lee este archivo ANTES de proponer
nada y añade una fila al índice + una ficha por cada candidato que evalúa en serio.
Las filas no se borran: sólo cambia la columna **Estado** cuando el usuario decide.

- **Veredicto:** `Recomendado` · `Alternativa` · `Descartado`
- **Estado:** `Sugerido` · `Rechazado por el usuario` · `Spec escrita` · `Implementado`

## Índice

| #   | Fecha      | id propuesto  | Título      | Categoría | Veredicto   | Estado       |
| --- | ---------- | ------------- | ----------- | --------- | ----------- | ------------ |
| 001 | 2026-10-03 | `asteroides`  | ASTEROIDES  | SHOOTER   | Recomendado | Implementado |
| 002 | 2026-10-04 | `tetris`      | TETRIS      | PUZZLE    | Recomendado | Implementado |
| 003 | 2026-10-04 | `arkanoid`    | ARKANOID    | ARCADE    | Recomendado | Implementado |
| 004 | 2026-10-05 | `snake`       | SNAKE       | ARCADE    | Recomendado | Implementado |
| 005 | 2026-10-08 | `invasores`   | INVASORES   | SHOOTER   | Recomendado | Sugerido     |
| 006 | 2026-10-08 | `gloton`      | GLOTÓN      | ARCADE    | Alternativa | Spec escrita |
| 007 | 2026-10-08 | `ranaria`     | RANARIA     | ARCADE    | Alternativa | Sugerido     |
| 008 | 2026-10-08 | `duelo-pixel` | DUELO PIXEL | VERSUS    | Descartado  | Sugerido     |
| 009 | 2026-10-08 | `columnas`    | COLUMNAS    | PUZZLE    | Descartado  | Sugerido     |
| 010 | 2026-10-12 | `gloton`      | GLOTÓN      | ARCADE    | Recomendado | Spec escrita |
| 011 | 2026-10-17 | `invasores`   | INVASORES   | SHOOTER   | Recomendado | Spec escrita |
| 012 | 2026-10-18 | `columnas`    | COLUMNAS    | PUZZLE    | Recomendado | Spec escrita |

## Fichas

### 001 — ASTEROIDES (`asteroides`)

Implementado · spec 05 · motor en `lib/games/asteroids/` · referencia `references/started-games/02-asteroids`. Mecánica: nave vectorial con inercia y disparo. Siembra: no volver a sugerir.

### 002 — TETRIS (`tetris`)

Implementado · spec 07 · motor en `lib/games/tetris/` · referencia `references/started-games/03-tetris`. Mecánica: caída de piezas sobre rejilla. Siembra: no volver a sugerir.

### 003 — ARKANOID (`arkanoid`)

Implementado · spec 08 · motor en `lib/games/arkanoid/` · referencia `references/started-games/04-arkanoid`. Mecánica: rebote de pelota y destrucción de muros, con niveles y sonido. Siembra: no volver a sugerir.

### 004 — SNAKE (`snake`)

Implementado · spec 09 · motor en `lib/games/snake/` · sin código de referencia (assets en `references/source-assets/snake-assets/`). Mecánica: serpiente sobre rejilla que crece. Siembra: no volver a sugerir.

### 005 — INVASORES (`invasores`)

- **Fecha:** 2026-10-08 · **Veredicto:** Recomendado · **Estado:** Sugerido
- **Pitch (1 frase):** Olas de alienígenas descienden en formación mientras tu cañón se cubre tras búnkeres que se deshacen disparo a disparo.
- **Categoría / color propuestos:** SHOOTER / green
- **Encaje técnico:** **Alto.** Todo es aritmética de rectángulos sobre canvas 2D: formación en rejilla que marcha en bloque, invierte dirección y baja al tocar el borde, un disparo del jugador, bombas alienígenas y colisiones AABB. Módulos previstos `constants.ts`, `entities.ts`, `engine.ts`, `input.ts` (+ `levels.ts` opcional para las olas); los invasores se dibujan con rectángulos de píxeles en código, sin spritesheet, así que **no hay assets nuevos**. La portada `.cover-invaders` ya existe en `app/globals.css` (aliens verdes + cañón cian), heredada del prototipo. Único punto fino: los búnkeres destructibles piden una máscara por píxeles (un `ImageData` o rejilla de celdas pequeñas por búnker), resoluble sin dependencias. Sin física compleja, sin red, sin 3D.
- **Encaje de scoring:** **Alto.** Puntuación clásica, entero monótono creciente: 10 / 20 / 30 puntos por fila de alienígena (abajo → arriba) y nave nodriza de bonus 50–300. Fin de partida nítido y doble: vidas a 0 o la formación alcanza la superficie. Techo real holgadísimo dentro de 0–9 999 999 (≈990 puntos por ola limpia más bonus; harían falta miles de olas para desbordar).
- **Diversidad:** Aporta mecánicas que hoy **no existen** en el catálogo: enemigos que disparan de vuelta, avance por olas con dificultad creciente y coberturas destructibles. SHOOTER ya está ocupada por `asteroides`, pero aquella es nave vectorial con inercia y 360°: aquí el cañón se mueve sólo en horizontal, sin inercia. Tensión reconocida: no abre categoría nueva (VERSUS sigue vacía, ver ficha 008), pero es la que mejor equilibra los tres criterios.
- **HUD / `GameEntry` previsto:** `engineLevel: true` (la ola es el nivel), `hasLives: true` (3 vidas), `hasSound: true` (los cuatro tonos de la marcha son parte de la identidad del juego), `aspect: "4 / 3"` (el valor por defecto, no hace falta declararlo), `levelJump: 5` para saltar de ola desde el overlay de pausa. Sin `hasLines` ni `blockStyles`.
- **Descartado a favor de / en contra de:** elegido por delante de 006 (GLOTÓN, mayor riesgo de motor por la IA de los fantasmas) y 007 (RANARIA, buen encaje pero más trabajo de configuración de carriles); por delante de 008 y 009, descartados por criterio.
- **Notas:** El prototipo ya trae la fila de catálogo diseñada en `references/templates/data.jsx` (`id: "invasores"`, título `INVASORES`, short/long, cat SHOOTER, cover `cover-invaders`, color green). `sort_order: 5` encaja con el hueco del prototipo (la tabla `games` usa 1, 2, 3 y 6; el 4 queda reservado para `gloton`). Siguiente spec libre: `specs/10-juego-invasores.md`. Sin código de referencia en `references/started-games/` (los tres existentes ya están portados), así que el spec debe incluir una sección `## Por qué existe este spec` como hizo `specs/09-juego-snake.md`.

### 006 — GLOTÓN (`gloton`)

- **Fecha:** 2026-10-08 · **Veredicto:** Alternativa · **Estado:** Spec escrita
- **Pitch (1 frase):** Un glotón recorre un laberinto comiendo puntos mientras cuatro espectros lo cazan, hasta que una píldora invierte los papeles.
- **Categoría / color propuestos:** ARCADE / yellow
- **Encaje técnico:** **Medio.** El dibujo y el movimiento sobre rejilla son triviales en canvas 2D y la portada `.cover-glot` ya existe, pero el corazón del juego es la IA: cuatro fantasmas con personalidades distintas, máquina de estados scatter/chase/frightened con temporizadores por nivel, casillas objetivo, túneles con wrap y la prohibición de girar 180°. Es el motor más caro y arriesgado de los evaluados; pediría `levels.ts` para los datos del laberinto además del cuarteto de módulos habitual. Sin assets externos (todo geometría), sin dependencias.
- **Encaje de scoring:** **Alto.** El mejor del lote: punto 10, píldora 50, fantasmas en cadena 200/400/800/1600, frutas 100–5000. Entero monótono, fin por vidas a 0, y el récord de partida perfecta (3 333 360) cabe de sobra en 0–9 999 999.
- **Diversidad:** **Alto.** Es la mecánica realmente ausente del catálogo: persecución en laberinto con IA enemiga e inversión de roles. Matiz en contra: ARCADE ya acumula dos juegos (`arkanoid`, `snake`), así que aporta mecánica nueva pero no categoría nueva.
- **HUD / `GameEntry` previsto:** `engineLevel: true`, `hasLives: true`, `hasSound: true`, `aspect` vertical (laberinto 28×31 celdas, algo cercano a `"28 / 31"`), `levelJump` según número de niveles.
- **Descartado a favor de / en contra de:** cede ante 005 (INVASORES) sólo por encaje técnico; gana a 007, 008 y 009 en scoring y diversidad.
- **Notas:** Candidato natural para el turno siguiente, cuando haya apetito por un motor más ambicioso. Fila de catálogo ya diseñada en el prototipo y `sort_order: 4` libre.

### 007 — RANARIA (`ranaria`)

- **Fecha:** 2026-10-08 · **Veredicto:** Alternativa · **Estado:** Sugerido
- **Pitch (1 frase):** Cruza una autopista de coches y un río de troncos a la deriva para llegar a los nenúfares antes de que se agote el tiempo.
- **Categoría / color propuestos:** ARCADE / green
- **Encaje técnico:** **Alto.** Carriles con obstáculos que se desplazan a velocidad constante y reaparecen por el lado opuesto; colisiones AABB por carril. La única sutileza es que, sobre un tronco, la rana hereda la velocidad de la plataforma (y muere si la plataforma la arrastra fuera de pantalla). Portada `.cover-rana` ya existe. Pide `levels.ts` con la configuración de cada carril (dirección, velocidad, separación), que es bastante tabla que afinar a mano.
- **Encaje de scoring:** **Medio-Alto.** Clásico y bien definido: 10 por avanzar de fila, 50 por alcanzar nenúfar, bonus por tiempo restante y 1000 por completar las cinco ranas. Monótono y con fin claro (vidas a 0, o muerte por tiempo, atropello o agua). Dentro de rango sin problema. Resta un punto que el tiempo límite añade una segunda condición de fin por nivel que hay que explicar bien en el HUD.
- **Diversidad:** **Alto.** Añade dos cosas inéditas: travesía por carriles con presión de reloj y plataformas móviles que transportan al jugador. Pero repite categoría ARCADE, ya la más poblada.
- **HUD / `GameEntry` previsto:** `engineLevel: true`, `hasLives: true`, `aspect` vertical (~`"3 / 4"`), `hasSound: true` opcional. El temporizador por vida no cabe en el `GameEntry` actual: habría que dibujarlo en canvas (coherente con "sólo dibujar en canvas lo que el HUD no puede mostrar") o ampliar el contrato, decisión que corresponde a `/add-game`.
- **Descartado a favor de / en contra de:** cede ante 005 (INVASORES) por volumen de configuración de carriles y por el añadido del temporizador fuera de contrato; por delante de 008 y 009.
- **Notas:** Fila de catálogo ya diseñada en el prototipo (`cover-rana`, color green).

### 008 — DUELO PIXEL (`duelo-pixel`)

- **Fecha:** 2026-10-08 · **Veredicto:** Descartado · **Estado:** Sugerido
- **Pitch (1 frase):** Dos paletas verticales se disputan una pelota luminosa, contra la CPU o en local a dos jugadores.
- **Categoría / color propuestos:** VERSUS / cyan
- **Encaje técnico:** **Alto.** Es el motor más simple imaginable: dos paletas, una pelota, rebote por ángulo. Portada `.cover-duelo` ya existe.
- **Encaje de scoring:** **Bajo — descalificación automática por criterio 2.** El Pong clásico termina al llegar a 11 puntos: el `best` del prototipo es literalmente `24`. Un leaderboard de enteros 0–9 999 999 con un techo de 11 no ordena nada, y en modo local a dos jugadores no existe _una_ puntuación individual que enviar con `submitScore`. **Ésta es la tensión de VERSUS explicitada:** la única categoría vacía del catálogo es también la que peor se lleva con un Salón de la Fama por puntos. Habría rescate (puntuar el rally más largo o la supervivencia contra una CPU que acelera, convirtiéndolo en un marcador de resistencia), pero eso deja de ser un VERSUS y pasa a ser un ARCADE de un jugador: deja de cumplir el motivo por el que se eligió.
- **Diversidad:** **Alto** en el papel (abre VERSUS, 0 juegos hoy), pero el valor es nominal si para puntuarlo hay que desnaturalizarlo.
- **HUD / `GameEntry` previsto:** n/a, descartado antes de llegar ahí.
- **Descartado a favor de / en contra de:** descartado frente a 005, 006 y 007, todos con scoring apto.
- **Notas:** No volver a proponerlo como VERSUS puro mientras el Salón de la Fama sea un ranking de enteros por jugador. Reconsiderable sólo si alguna vez se especifica un modo de puntuación de resistencia o un leaderboard de victorias.

### 009 — COLUMNAS (`columnas`)

- **Fecha:** 2026-10-08 · **Veredicto:** Descartado · **Estado:** Sugerido
- **Pitch (1 frase):** Tríos de gemas de colores caen en una rejilla y se destruyen al alinear tres iguales en cualquier dirección, con reacciones en cadena.
- **Categoría / color propuestos:** PUZZLE / magenta
- **Encaje técnico:** **Alto.** Rejilla, caída por gravedad, detección de líneas en tres ejes y cascada de recolocación. Nada exótico. Pero **no hay portada**: habría que crear `.cover-columnas` en `app/globals.css`, a diferencia de los candidatos del prototipo.
- **Encaje de scoring:** **Alto.** Puntos por gema eliminada con multiplicador por cadena, fin por desbordamiento del techo. Entero monótono, dentro de rango.
- **Diversidad:** **Bajo — motivo del descarte.** PUZZLE sólo tiene `tetris`, así que la categoría agradecería compañía, pero la mecánica es casi la misma que ya está implementada: piezas que caen sobre una rejilla con eliminación de líneas. Aportaría un segundo juego que se _siente_ como el que ya existe, y el catálogo tiene huecos mucho más grandes (laberinto, oleadas, travesía).
- **HUD / `GameEntry` previsto:** habría sido `engineLevel: true`, `hasLives: false`, `hasLines: true`, `blockStyles` reutilizando los de Tetris, `aspect: "7 / 10"`; el calco del `GameEntry` de `tetris` confirma por sí solo la redundancia.
- **Descartado a favor de / en contra de:** descartado frente a 005 (INVASORES), que aporta mecánica inédita en lugar de duplicar la de 002 (TETRIS).
- **Notas:** Único candidato evaluado que no viene del prototipo. Si en el futuro se busca específicamente poblar PUZZLE, mejor un match-3 o un puzzle de empuje (tipo Sokoban con contador de movimientos) que otra variante de piezas que caen.

### 010 — GLOTÓN (`gloton`) · game jam

- **Fecha:** 2026-10-12 · **Veredicto:** Recomendado · **Estado:** Spec escrita
- **Pitch (1 frase):** Un glotón recorre un laberinto de 28×31 comiendo 240 puntos mientras cuatro espectros lo cazan, hasta que una píldora invierte los papeles.
- **Categoría / color propuestos:** ARCADE / yellow
- **Encaje técnico:** **Medio-Alto según la variante.** El agente `game-jam` convirtió el riesgo que señalaba la ficha 006 (la IA de los espectros) en el eje de comparación: la variante A y la B lo recortan a una sola regla de caza (distancia euclídea al glotón en intersecciones, sin giro de 180°, espectros diferenciados por color y retardo de salida 0/3/6/9 s) y la C lo asume entero (cuarteto con personalidades, máquina `scatter/chase/frightened` con horario por nivel, salida por contador de puntos, ralentización en túnel). Sin assets externos en ninguna: todo geometría de canvas 2D; en C el sonido se sintetiza con Web Audio API (5 efectos + sirena), así que tampoco hay binarios. Módulos `constants.ts` / `levels.ts` / `entities.ts` / `input.ts` / `engine.ts`, más `ai.ts` y `audio.ts` en C.
- **Encaje de scoring:** **Alto.** Punto 10, píldora 50 y cadena de espectros en las tres. Techos alcanzables: A **14 600**, B **143 200** (cadena extendida hasta 12 800 por espectro, teórico), C **103 200** (5 niveles con frutas y bonus). Los tres dentro de `0–9 999 999`; fin inequívoco en todos (vidas a 0, o laberinto/nivel 5 limpio).
- **Diversidad:** **Alto.** Persecución en laberinto con IA enemiga e inversión de roles: la mecánica que seguía ausente del catálogo. Repite categoría ARCADE (ya con `arkanoid` y `snake`), tensión heredada de la ficha 006 y aceptada.
- **HUD / `GameEntry` previsto:** común a las tres: `hasLives: true`, `aspect: "28 / 31"` (canvas lógico 560×620, `CELL = 20`). A: `engineLevel: false`, sin cambios de contrato. B: `engineLevel: false` + campo nuevo `hasChain`/`onChain` (HUD `CADENA`, calcado de `hasLines`/`onLines` del SPEC 07). C: `engineLevel: true`, `hasSound: true`, `levelJump: 5`, sin cambios de contrato (reusa lo del SPEC 08).
- **Descartado a favor de / en contra de:** no hubo competencia: el tema de la jam nombraba el juego. Adelanta a la ficha 005 (INVASORES, `Recomendado`), que se queda en `Sugerido` por **petición directa del usuario**, no por mérito técnico.
- **Notas:** Entrada de **game jam**, no de `game-planner`: revisa la ficha 006 (misma `id`, misma fila de catálogo) y la convierte en tres diseños completos y comparables del mismo juego, en estado `Borrador`:
  - `specs/game-jam/gloton/00-brief.md` — estado real del catálogo, identidad común, tabla comparativa y recomendación (**variante B**).
  - `specs/game-jam/gloton/00-preguntas.md` — 11 dudas abiertas, cada una con el valor por defecto ya aplicado en los specs.
  - `specs/game-jam/gloton/A-juego-gloton.md` — mínima fiel (un laberinto, IA de una sola regla, sin audio).
  - `specs/game-jam/gloton/B-juego-gloton.md` — twist «eco de la píldora»: cada espectro devorado alarga la inversión 1,5 s y la cadena no se reinicia entre píldoras.
  - `specs/game-jam/gloton/C-juego-gloton.md` — de autor: 5 niveles, 2 trazados, cuarteto con personalidades, frutas, audio sintetizado y salto de nivel.

  Catálogo: **`INSERT`** en `games` con `sort_order: 4` (la tabla real sólo usa 1, 2, 3 y 6; `20261005120000_remove_unimplemented_games.sql` borró la fila placeholder `gloton` y sus `scores` por cascada, así que no hay placeholder que actualizar). Portada **reutilizada**: `.cover-glot` ya existe en `app/globals.css`. Al promover: copiar la variante elegida a **`specs/10-juego-gloton.md`** con `Estado: Aprobado` y ejecutar `/spec-impl 10-juego-gloton` (`/spec-impl` no recursa en `specs/`, así que la promoción es manual).

### 011 — INVASORES (`invasores`) · game jam

- **Fecha:** 2026-10-17 · **Veredicto:** Recomendado · **Estado:** Spec escrita
- **Pitch (1 frase):** Una formación de 55 alienígenas marcha y desciende hacia la superficie mientras el cañón se cubre tras cuatro búnkeres que se deshacen impacto a impacto.
- **Categoría / color propuestos:** SHOOTER / green
- **Encaje técnico:** **Alto, confirmado.** Todo es aritmética de rectángulos sobre canvas 2D: marcha en bloque con paso discreto (`STEP_X = 8` px cada `80 + 13 × (vivos − 1)` ms), inversión y descenso de 16 px al borde, un único disparo del jugador en pantalla, bombas desde los invasores más bajos de cada columna y colisiones AABB. **Sin assets en ninguna variante**: invasores, cañón y búnkeres se dibujan con rectángulos, y en C el audio se sintetiza con Web Audio API. El punto fino que señalaba la ficha 005 (búnkeres destructibles) se resuelve con una máscara de celdas `boolean[8][12]` de 6×6 px por búnker, destruyendo celda + 4 vecinas por impacto. Canvas lógico 800×600, `aspect` por defecto `4 / 3`. Módulos `constants` / `entities` / `input` / `engine`, más `levels.ts` y `audio.ts` en C.
- **Encaje de scoring:** **Alto, pero con una tensión que el jam convierte en el eje de comparación.** La puntuación clásica (30/20/20/10/10 por fila) da un techo de sólo **990** por ola: con una ola única (variante A) todas las partidas perfectas empatan, igual que ya pasa con Snake y sus 2520. A lo acepta y lo declara; **B** lo resuelve con el delator (techo **10 450**) y **C** con olas, nodriza y bonus (techo **16 950**). Los tres caben en `0–9 999 999`, y los tres tienen el mismo fin triple e inequívoco: vidas a 0, formación en `y = 520`, o victoria.
- **Diversidad:** **Alto.** Aporta tres mecánicas que el catálogo no tiene: enemigos que disparan de vuelta, formación que desciende y coberturas destructibles. Repite categoría SHOOTER con `asteroides`, tensión ya reconocida en la ficha 005 y aceptada: aquella es nave vectorial con inercia y 360°, ésta es un cañón horizontal sin inercia.
- **HUD / `GameEntry` previsto:** común a las tres: `hasLives: true`, `touch: { dpad: ["left","right"], buttons: [{ id: "a", label: "DISPARAR" }] }`, aspecto por defecto. A: `engineLevel: false`, sin cambios de contrato. B: `engineLevel: false` + campo nuevo `hasChain`/`onChain` (HUD `CADENA`, calcado de `hasLines`/`onLines` del SPEC 07). C: `engineLevel: true`, `hasSound: true`, `levelJump: 5`, sin cambios de contrato (reusa lo del SPEC 08).
- **Descartado a favor de / en contra de:** no hubo competencia real. De las fichas no implementadas, `ranaria` ya se construyó como `frogger`, `gloton` ya tiene su jam (ficha 010), y `duelo-pixel` y `columnas` están descartados por criterio. `invasores` era el único `Recomendado` sin consumir.
- **Notas:** Entrada de **game jam**, no de `game-planner`: desarrolla la ficha 005 (misma `id`, misma portada) y la convierte en tres diseños completos y comparables del mismo juego, en estado `Borrador`. **La ficha 005 se deja en `Sugerido` a propósito**: la decisión de aceptarla es del usuario tras revisar los specs.
  - `specs/game-jam/invasores/00-brief.md` — estado real del catálogo, identidad común, tabla comparativa y recomendación (**variante B**).
  - `specs/game-jam/invasores/00-preguntas.md` — 16 dudas abiertas, cada una con el valor por defecto ya aplicado en los specs.
  - `specs/game-jam/invasores/A-juego-invasores.md` — mínima fiel: una sola ola de 55, 3 vidas, 4 búnkeres, sin audio. Techo 990.
  - `specs/game-jam/invasores/B-juego-invasores.md` — twist «el delator»: siempre hay un invasor marcado que vale ×5 y encadena; bonus final `mejor cadena × 100`. Techo 10 450.
  - `specs/game-jam/invasores/C-juego-invasores.md` — de autor: 5 olas con tabla de dificultad, nave nodriza, vida extra a los 5000, audio sintetizado y salto de ola. Techo 16 950.

  Catálogo: **`INSERT`** en `games` con `sort_order: 7` (la tabla real usa 1, 2, 3, 5 y 6; el `5` que la ficha 005 proponía lo ocupó `frogger` en `20261015120000_game_frogger.sql` y el `4` está comprometido con la jam de `gloton`). No hace falta `delete from public.scores`: `20261005120000_remove_unimplemented_games.sql` ya borró la fila placeholder `invasores` y sus `scores` por cascada. Portada **reutilizada**: `.cover-invaders` ya existe en `app/globals.css:758` y hoy está huérfana. Al promover: copiar la variante elegida a **`specs/12-juego-invasores.md`** con `Estado: Aprobado` y ejecutar `/spec-impl 12-juego-invasores` (`/spec-impl` no recursa en `specs/`, así que la promoción es manual).

### 012 — COLUMNAS (`columnas`) · game jam

- **Fecha:** 2026-10-18 · **Veredicto:** Recomendado · **Estado:** Spec escrita
- **Pitch (1 frase):** Tríos de gemas caen en un pozo de 6×13 y se destruyen al alinear tres iguales en horizontal, vertical o en cualquiera de las dos diagonales, con cascadas encadenadas que multiplican hasta ×16.
- **Categoría / color propuestos:** PUZZLE / **cyan** (la ficha 009 proponía `magenta`, pero es el color de `tetris` y los dos PUZZLE saldrían con el mismo neón en la biblioteca: justo la confusión que esta jam existe para evitar).
- **Encaje técnico:** **Alto, confirmado.** Rejilla de 6×13 con celda de 40 px, canvas lógico 360×520 (pozo 240 + panel SIGUIENTE 120), `aspect: "9 / 13"`. Todo es aritmética de rejilla: caída por pasos discretos, ciclado de los tres colores del trío, barrido de series en cuatro ejes con marcado en un `Set` (una gema nunca se cuenta dos veces), gravedad por columna y bucle de cascada con parpadeo de 180 ms. **Sin assets en ninguna variante**: las gemas se dibujan con rectángulos redondeados más un glifo interior por color (accesibilidad para daltonismo), y en C el audio se sintetiza con Web Audio API. Módulos `constants` / `entities` / `input` / `engine`, más `levels.ts` y `audio.ts` en C. **Punto fino heredado de la ficha 009, confirmado:** es el único candidato que no viene del prototipo y **no tiene portada**, así que las tres variantes incluyen crear `.cover-columnas` en `app/globals.css` (las dos clases huérfanas, `.cover-rana` y `.cover-duelo`, son una rana y dos palas de Pong: reutilizarlas sería reescribirlas con peor nombre).
- **Encaje de scoring:** **Alto.** 10 puntos por gema × multiplicador de cascada `[1, 2, 4, 8, 16]` en las tres. A y B son **modos sin fin** y su techo no está acotado por diseño, como el TETRIS ya implementado: el motor emite `Math.min(score, 9_999_999)` para que el `CHECK` no pueda romperse (prácticas: A 5 000–15 000, B 15 000–40 000). C sí está **acotada: 129 100**, con la cota demostrada en el spec a partir de las 78 celdas del pozo y los objetivos de las cinco vetas. Fin inequívoco en las tres: desbordamiento al generar el trío; C añade victoria al completar la veta 5.
- **Diversidad:** **La objeción de la ficha 009 es el eje de la jam, no una nota al pie.** Aquella decía que `columnas` «aportaría un segundo juego que se _siente_ como el que ya existe (`tetris`)»; cada variante lleva una sección propia **`## En qué se diferencia de TETRIS`** con cinco diferencias estructurales (la pieza no rota, se **cicla** los colores y nunca cambia de forma, así que no hay wall kicks · **no existen las líneas**: una fila llena no hace nada si los colores no casan · se elimina en **cuatro ejes**, incluidas las dos diagonales · hay **cascadas encadenadas**, que TETRIS no tiene · el recurso es el **color** y no el espacio, y no puede haber huecos), y cada diferencia tiene su criterio de aceptación. B añade una sexta (el barrido cromático del prisma, imposible en TETRIS) y C añade tres más (el nivel cambia el **número de colores**, hay materia que no casa, y la partida se puede **ganar**). PUZZLE pasa de uno a dos juegos.
- **HUD / `GameEntry` previsto:** común a las tres: `hasLives: false`, **`hasLines` ausente a propósito** (no hay líneas), `blockStyles: BLOCK_STYLES`, `aspect: "9 / 13"`, `touch: { dpad: ["up","down","left","right"], buttons: [{ id: "a", label: "CICLAR" }, { id: "b", label: "CAÍDA" }] }`. A: `engineLevel: false`, sin cambios de contrato. B: `engineLevel: false` + campo nuevo `hasPrism`/`onPrism` (HUD `PRISMA`, calcado de `hasLines`/`onLines` del SPEC 07). C: `engineLevel: true`, `hasSound: true`, `levelJump: 5`, sin cambios de contrato (reusa lo del SPEC 08).
- **Descartado a favor de / en contra de:** no hubo competencia real. De las fichas de `game-planner` sin implementar y sin jam quedaban sólo `columnas` (009) y `duelo-pixel` (008); esta última está descartada por un motivo que una jam **no puede arreglar** (un Pong a 11 puntos no ordena un leaderboard de enteros y en local a dos no hay _una_ puntuación que enviar), mientras que la objeción de 009 era de diversidad y sí se puede atacar con diseño.
- **Notas:** Entrada de **game jam**, no de `game-planner`: desarrolla la ficha 009 (misma `id`) y la convierte en tres diseños completos y comparables del mismo juego, en estado `Borrador`. **La ficha 009 se deja en `Sugerido` a propósito**: aceptarla es decisión del usuario tras revisar los specs.
  - `specs/game-jam/columnas/00-brief.md` — estado real del catálogo, identidad común, el cuadro de diferencias con TETRIS, tabla comparativa y recomendación (**variante B**).
  - `specs/game-jam/columnas/00-preguntas.md` — 18 dudas abiertas, cada una con el valor por defecto ya aplicado en los specs.
  - `specs/game-jam/columnas/A-juego-columnas.md` — mínima fiel: 6 colores, modo sin fin, aceleración por gemas eliminadas, sin audio. Techo no acotado (clamp 9 999 999).
  - `specs/game-jam/columnas/B-juego-columnas.md` — twist «la gema prisma»: cada 25 gemas llega un trío prisma que borra del pozo todas las gemas del color que tenga debajo, a ×2 más 200 de bonus. Techo no acotado (clamp 9 999 999).
  - `specs/game-jam/columnas/C-juego-columnas.md` — de autor «vetas profundas»: 5 vetas de 4 a 6 colores con objetivo, gemas de roca desde la tercera, bonus `1000 × veta`, audio sintetizado y salto de veta. Techo **129 100**, con victoria.

  Catálogo: **`INSERT`** en `games` con `sort_order: 8` (la tabla real usa 1, 2, 3, 5 y 6; el `4` está comprometido con la jam de `gloton`, el `5` lo ocupó `frogger` y el `7` con la jam de `invasores`). No hace falta `delete from public.scores`: `columnas` no viene del prototipo, nunca tuvo fila placeholder y nunca ha habido `scores` con ese `game_id`. Portada **nueva**: `.cover-columnas` no existe en `app/globals.css` y la crea la variante que se implemente. Al promover: copiar la variante elegida a **`specs/13-juego-columnas.md`** con `Estado: Aprobado` y ejecutar `/spec-impl 13-juego-columnas` (el `12` está comprometido con la jam de `invasores`; reconfirmar con `ls specs/` y usar el primer número realmente libre. `/spec-impl` no recursa en `specs/`, así que la promoción es manual).
