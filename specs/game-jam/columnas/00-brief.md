# Game jam — COLUMNAS: tres diseños del mismo juego

- **Fecha:** 2026-10-18
- **Tema recibido (literal):** «COLUMNAS (`columnas`), el puzzle de tríos de gemas que caen y se destruyen al alinear tres iguales en cualquier dirección, con reacciones en cadena».
- **Juego elegido:** **COLUMNAS** (`id: columnas`). Candidato ya registrado: **ficha 009** de `references/game-suggestions-todo.md` (2026-10-08 · Veredicto `Descartado` · Estado `Sugerido`). No se inventa ningún candidato nuevo.
- **Por qué este y no otro de la lista:** de las fichas de `game-planner` sin implementar y sin jam quedaban sólo `columnas` (009) y `duelo-pixel` (008). `duelo-pixel` está descartado por un motivo que una jam **no puede arreglar** (un Pong a 11 puntos no ordena un leaderboard de enteros, y en local a dos jugadores no hay _una_ puntuación que enviar con `submitScore`). `columnas` está descartado por un motivo que una jam **sí puede atacar**: su encaje técnico y su encaje de scoring son **Altos**, y la única objeción de la ficha 009 fue de **diversidad** — «aportaría un segundo juego que se _siente_ como el que ya existe (`tetris`)».

## El encargo de esta jam: que no se sienta como TETRIS

La objeción de la ficha 009 es el eje de la jam, no una nota al pie. Cada variante lleva una sección propia **`## En qué se diferencia de TETRIS`** y las tres comparten cinco diferencias estructurales, no cosméticas:

| Eje                 | TETRIS (SPEC 07, ya implementado)                                    | COLUMNAS (las tres variantes)                                                                                                                  |
| ------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| La pieza            | 7 tetrominós de 4 bloques que **rotan en el plano**, con wall kicks. | **Un único trío vertical** de 3 gemas que nunca cambia de forma; `↑` **cicla los colores dentro de la columna**.                               |
| Qué elimina         | **Filas completas**: hay que tapar 10 huecos de una fila.            | **Tres o más gemas del mismo color** en horizontal, vertical **o en las dos diagonales**. Una fila llena no hace nada si los colores no casan. |
| Reacciones          | No hay. Las líneas se limpian a la vez y nunca encadenan.            | **Cascadas**: lo que queda arriba cae y puede volver a casar, con multiplicador creciente hasta ×16.                                           |
| Recurso del jugador | Espacio: encajar formas sin dejar huecos.                            | **Color**: no hay huecos posibles (la gravedad es por columna); el reto es la adyacencia cromática y la diagonal.                              |
| HUD                 | PUNTOS · LÍNEAS · NIVEL.                                             | Sin `LÍNEAS` en ninguna variante (no existen las líneas). A: sólo PUNTOS. B: PUNTOS · PRISMA. C: PUNTOS · NIVEL.                               |

Más, en números: pozo de **6×13** frente a 10×20, pieza de **3** gemas frente a 4 bloques, **6 colores** con significado mecánico frente a 7 colores decorativos, **sin wall kicks** (la pieza nunca ocupa más de una columna, así que no hay nada que desplazar).

## Estado del catálogo leído

| Fuente                                                              | Fecha      | Qué dice                                                                                                                                                                                     |
| ------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `references/catalogo-juegos.md` (snapshot)                          | 2026-10-06 | 4 juegos: `arkanoid`, `tetris`, `snake`, `asteroides`. **Desfasado:** no lista `frogger`.                                                                                                    |
| Tabla `games` real (`select` de sólo lectura)                       | 2026-10-18 | 5 filas: `arkanoid` (1), `tetris` (2), `snake` (3), `frogger` (5), `asteroides` (6). **No hay filas placeholder.**                                                                           |
| `supabase/migrations/20261005120000_remove_unimplemented_games.sql` | —          | Borró los placeholders `gloton`, `invasores`, `ranaria` y `duelo-pixel`. **Nunca existió una fila `columnas`.**                                                                              |
| `supabase/migrations/20261015120000_game_frogger.sql`               | —          | Última migración aplicada: `INSERT` de `frogger` con `sort_order: 5`.                                                                                                                        |
| `ls lib/games/`                                                     | —          | `arkanoid`, `asteroids`, `frogger`, `snake`, `tetris`, más `registry.ts`, `touch.ts`, `types.ts`. **No hay motor `columnas`.**                                                               |
| `grep '^\.cover-' app/globals.css`                                  | —          | `cover-bg`, `cover-bricks`, `cover-tetro`, `cover-snake`, `cover-frogger`, `cover-glot`, `cover-invaders`, `cover-asteroides`, `cover-rana`, `cover-duelo`. **No existe `.cover-columnas`.** |
| `lib/games/registry.ts`                                             | —          | `GameEntry` ya tiene `engineLevel`, `hasLives`, `hasLines`, `blockStyles`, `aspect`, `hasSound`, `levelJump` y `touch`.                                                                      |
| `lib/home-data.ts`                                                  | —          | La actividad reciente no menciona «Columnas»: ninguna variante lo toca.                                                                                                                      |
| `ls specs/`                                                         | —          | Specs `01`–`11` ocupados. El `12` está comprometido con la jam de `invasores` → **el siguiente libre para esta jam es `13`**.                                                                |

**Consecuencia para la migración:** las tres variantes usan **`INSERT`**, no `UPDATE`. `columnas` es el único candidato evaluado que **no viene del prototipo** `references/templates/data.jsx`, así que nunca tuvo fila placeholder: el precedente 07/08/09 (`UPDATE` de un placeholder) no aplica, y **no hace falta `delete from public.scores`** porque no hay ni ha habido filas con ese `game_id`.

**Consecuencia para la portada:** `.cover-columnas` **no existe** y hay que crearla. Las dos clases huérfanas disponibles (`.cover-rana`, una rana sobre troncos; `.cover-duelo`, dos palas de Pong) no tienen nada que ver con gemas, así que reutilizar sería peor que crear. Las tres variantes incluyen la creación de `.cover-columnas` en `app/globals.css` dentro de su alcance; es el único punto en el que esta jam añade CSS nuevo y el único en el que se aparta del patrón «reutilizar portada» de las jams de `gloton` e `invasores`.

## Identidad común a las tres variantes

Las tres son **el mismo juego**: misma ruta, misma fila de catálogo, mismo canvas, mismo mando. Sólo cambia el diseño del motor y, con él, el texto `long`.

| Campo        | Valor                                                                                                                 |
| ------------ | --------------------------------------------------------------------------------------------------------------------- |
| `id`         | `columnas` (= ruta `/juegos/columnas`, carpeta `lib/games/columnas`)                                                  |
| `title`      | `COLUMNAS`                                                                                                            |
| `short`      | `Alinea tres gemas iguales en cualquier dirección.`                                                                   |
| `category`   | `PUZZLE` (segunda de la categoría, hoy sólo con `tetris`)                                                             |
| `color`      | `cyan` (ver pregunta 3 de `00-preguntas.md`: la ficha 009 proponía `magenta`, el de TETRIS)                           |
| `cover`      | `cover-columnas` — **clase nueva**, se crea en `app/globals.css` en las tres variantes                                |
| `sort_order` | `8`                                                                                                                   |
| Migración    | `INSERT` en `public.games`, sin `delete` previo de `scores`                                                           |
| `long`       | **distinto por variante** (describe sólo las mecánicas que esa variante tiene)                                        |
| Canvas       | **360×520** lógico (pozo 240 + panel SIGUIENTE 120), `aspect: "9 / 13"`                                               |
| Pozo         | `COLS = 6`, `ROWS = 13`, `CELL = 40`, trío que aparece en la columna 3 ocupando las filas 0, 1, 2                     |
| Mando táctil | `touch: { dpad: ["up","down","left","right"], buttons: [{ id: "a", label: "CICLAR" }, { id: "b", label: "CAÍDA" }] }` |
| Assets       | **Ninguno** en las tres: las gemas se dibujan con rectángulos redondeados y un glifo interior                         |

`sort_order: 8` es el primer hueco realmente libre: la tabla real usa 1, 2, 3, 5 y 6; el `4` está comprometido con la jam de `gloton`, el `5` lo ocupó `frogger` y el `7` está comprometido con la jam de `invasores`.

## Base de juego común (igual en A, B y C)

Para que la comparativa sea honesta, estas reglas son idénticas en las tres variantes y cada spec las repite entera:

- Pozo de 6 columnas × 13 filas, celda de 40 px. Trío vertical de 3 gemas que cae de una en una fila.
- `←`/`→` mueven de columna, `↓` desciende rápido, `↑`/`X` **ciclan** los colores del trío (`[arriba, medio, abajo]` → `[abajo, arriba, medio]`), `ESPACIO` caída instantánea, `P`/`Escape` pausan. En A y B el descenso rápido y la caída suman +1 por fila; en C no puntúan (ver la fila «Puntuación» de la comparativa).
- Al posarse, el trío se fija al instante (sin lock delay) y empieza la **resolución**: se marcan todas las series de **3 o más gemas iguales** en horizontal, vertical, diagonal ↘ y diagonal ↗; una gema que pertenece a varias series se cuenta **una sola vez**; parpadean 180 ms, se borran, cada columna compacta hacia abajo y se vuelve a buscar. Cada vuelta es un **escalón de cascada**.
- Puntuación base: `gemas del escalón × 10 × CHAIN_MULT`, con `CHAIN_MULT = [1, 2, 4, 8, 16]` por escalón 1..5+ (tope ×16).
- Fin de partida: al generar el trío, si alguna de las celdas `(col 3, filas 0/1/2)` está ocupada → `onGameOver(score)` una sola vez y el canvas queda congelado.
- Dibujado en canvas sólo lo que el HUD React no puede mostrar: pozo, gemas, trío en caída, parpadeo de eliminación y panel **SIGUIENTE**. Sin puntuación, sin overlays.

## Comparativa de las tres variantes

| Eje                   | **A — Mínima fiel**                                                                                                               | **B — Con twist «la gema prisma»**                                                                                                          | **C — De autor, «vetas profundas»**                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enfoque               | El clásico jugable con el mínimo alcance: 6 colores fijos, modo sin fin, sin audio.                                               | La base de A **más una** mecánica propia que cambia la fórmula y añade una decisión de colocación.                                          | Reinterpretación completa: **5 vetas** con objetivo, colores crecientes, gemas de roca, audio sintetizado y salto de nivel.                                |
| Mecánica diferencial  | Ninguna. Fidelidad: ciclado del trío, 4 ejes de alineación, cascadas.                                                             | **La gema prisma:** cada 25 gemas llega un trío prisma; donde aterriza **borra del pozo todas las gemas del color que haya debajo**.        | Progresión por vetas (4 → 6 colores, caída de 700 → 300 ms), **gemas de roca** que sólo se rompen por contacto, bonus por veta.                            |
| Puntuación            | `gemas × 10 × ×1/×2/×4/×8/×16` por escalón · +1 por fila de descenso rápido o caída.                                              | Lo mismo, **más** el barrido del prisma a `gemas × 10 × 2` y `PRISM_BONUS = 200` por prisma usado.                                          | Mismo cálculo por escalón, **más** roca 50 planos · bonus de veta `1000 × veta` · el descenso y la caída **no** puntúan (para que el techo quede acotado). |
| Puntuación máxima     | **Sin techo por diseño** (modo sin fin, como TETRIS); clamp `Math.min(score, 9_999_999)`. Partida larga típica 5 000–15 000.      | **Sin techo por diseño**; mismo clamp. Partida larga típica 15 000–40 000.                                                                  | **Acotada: 129 100** (cota superior demostrada en el spec). Partida típica 25 000–40 000.                                                                  |
| Fin de partida        | Desbordamiento del pozo al generar el trío. Sin victoria.                                                                         | Desbordamiento del pozo al generar el trío. Sin victoria.                                                                                   | Desbordamiento **o victoria** al completar el objetivo de la veta 5.                                                                                       |
| Campos de `GameEntry` | `engineLevel: false`, `hasLives: false`, `blockStyles`, `aspect: "9 / 13"`, `touch`                                               | Lo de A **más `hasPrism: true`** (nuevo).                                                                                                   | `engineLevel: true`, `hasLives: false`, `hasSound: true`, `levelJump: 5`, `blockStyles`, `aspect: "9 / 13"`, `touch`                                       |
| Contrato              | **Sin cambios** (todo existe ya).                                                                                                 | Amplía con `hasPrism` + `onPrism`, calcado de `hasLines`/`onLines` del SPEC 07; el HUD gana **PRISMA**.                                     | **Sin cambios** (reusa `hasSound`/`muted`/`volume`/`jumpTo` del SPEC 08).                                                                                  |
| Audio                 | Ninguno.                                                                                                                          | Ninguno.                                                                                                                                    | **Sintetizado** con Web Audio API (6 efectos, el de cascada sube de tono por escalón). Sin binarios en `public/`.                                          |
| Módulos del motor     | `constants` · `entities` · `input` · `engine`                                                                                     | Los mismos 4.                                                                                                                               | Los 4 **más** `levels.ts` y `audio.ts`.                                                                                                                    |
| Distancia a TETRIS    | **Alta ya de serie** (ciclado, diagonales, cascadas, sin líneas), pero el HUD y la silueta del pozo son lo más parecido del lote. | **La mayor por unidad de riesgo:** el barrido de color no tiene análogo posible en TETRIS y convierte la partida en una decisión cromática. | **La mayor en términos absolutos** (objetivos, rocas, audio, vetas), pero a costa de ser otro juego más grande.                                            |
| Riesgo                | **Bajo.** Lo único fino es el barrido de series en 4 ejes sin contar gemas dos veces.                                             | **Medio.** Toca `game-player.tsx` y `types.ts`; el prisma puede regalar puntuaciones enormes si cae sobre el color dominante.               | **Alto, declarado.** Audio sintetizado, 5 vetas que balancear, rocas que pueden bloquear el pozo y salto de veta que permite farmear bonus.                |
| Esfuerzo              | 10 pasos de plan.                                                                                                                 | 11 pasos de plan.                                                                                                                           | 13 pasos de plan.                                                                                                                                          |

## Recomendación

**B — «la gema prisma».** Razón única: el encargo de esta jam no es hacer un Columnas, es hacer un Columnas que **nadie confunda con TETRIS**, y B es la variante que más distancia gana por cada unidad de riesgo. El barrido de color del prisma es una acción que en TETRIS **no puede existir** (allí no hay color con significado mecánico), cambia la fórmula de puntuación, añade una decisión real en cada aterrizaje —dónde dejar caer el prisma depende de qué color domina el pozo— y lo consigue con una sola regla nueva, sin tocar la física ni el balance de A y con un cambio de contrato de dos líneas ya ensayado en el SPEC 07.

Si lo que se busca es **cerrar rápido y sin tocar `GameCanvasProps`**, A: ya es un juego distinto de TETRIS y es el lote de menor riesgo. Si hay apetito por el juego completo con objetivos, rocas y sonido, C, asumiendo que es el motor más caro de los tres y el que más balance pide.

## Promoción (trabajo manual del usuario)

`/spec-impl` hace `ls specs/` sin recursión: **no ve** `specs/game-jam/`. Para construir una variante:

1. Elegir una de `specs/game-jam/columnas/A-juego-columnas.md`, `B-juego-columnas.md` o `C-juego-columnas.md`.
2. Copiarla a **`specs/13-juego-columnas.md`** (el `12` está comprometido con la jam de `invasores`; reconfirmar con `ls specs/` y usar el primer número realmente libre si esa jam ya se promovió o se descartó).
3. Cambiar la cabecera a `Estado: Aprobado` y borrar la línea `Game jam:` y la línea `Al aprobar:`.
4. Ejecutar **`/spec-impl 13-juego-columnas`** (o `/spec-impl-game 13-juego-columnas` para encadenar `skin-designer` y `mobile-porter`).

Las tres variantes son implementables por separado: sólo una se construirá. Las otras dos quedan como registro de la jam. La ficha 009 de `references/game-suggestions-todo.md` se deja **a propósito** en `Sugerido`: aceptar el juego es decisión del usuario tras leer estos specs.

Dudas abiertas y sus valores por defecto ya aplicados: `specs/game-jam/columnas/00-preguntas.md`.
