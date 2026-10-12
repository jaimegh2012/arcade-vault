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
| 006 | 2026-10-08 | `gloton`      | GLOTÓN      | ARCADE    | Alternativa | Sugerido     |
| 007 | 2026-10-08 | `ranaria`     | RANARIA     | ARCADE    | Alternativa | Sugerido     |
| 008 | 2026-10-08 | `duelo-pixel` | DUELO PIXEL | VERSUS    | Descartado  | Sugerido     |
| 009 | 2026-10-08 | `columnas`    | COLUMNAS    | PUZZLE    | Descartado  | Sugerido     |

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

- **Fecha:** 2026-10-08 · **Veredicto:** Alternativa · **Estado:** Sugerido
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
