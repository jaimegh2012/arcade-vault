# Game jam — INVASORES: tres diseños del mismo juego

- **Fecha:** 2026-10-17
- **Tema recibido (literal):** «elige un juego ya registrado en `references/game-suggestions-todo.md` que no esté implementado todavía y úsalo como tema de la jam».
- **Juego elegido:** **INVASORES** (`id: invasores`). Candidato ya registrado: **ficha 005** de `references/game-suggestions-todo.md` (2026-10-08 · Veredicto `Recomendado` · Estado `Sugerido`). No se inventa ningún candidato nuevo.
- **Por qué este y no otro de la lista:** de las cinco fichas no implementadas, `ranaria` ya se construyó como `frogger` (fila real en `games`, motor en `lib/games/frogger/`), `gloton` ya tiene su propia jam en `specs/game-jam/gloton/`, y `duelo-pixel` y `columnas` están **descartados** por criterio (scoring de techo 11 el primero, mecánica redundante con Tetris el segundo). Queda `invasores`, que además es el único con veredicto `Recomendado` sin consumir: encaje técnico alto (aritmética de rectángulos, sin assets externos, portada ya existente), scoring clásico monótono con fin doble e inequívoco, y tres mecánicas inéditas en el catálogo (enemigos que disparan de vuelta, formación que desciende, coberturas destructibles).

## Estado del catálogo leído

| Fuente                                                              | Fecha      | Qué dice                                                                                                                |
| ------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| `references/catalogo-juegos.md` (snapshot)                          | 2026-10-06 | 4 juegos: `arkanoid`, `tetris`, `snake`, `asteroides`. **Desfasado:** no lista `frogger`.                               |
| Tabla `games` real (`select` de sólo lectura)                       | 2026-10-17 | 5 filas: `arkanoid` (1), `tetris` (2), `snake` (3), `frogger` (5), `asteroides` (6). **No hay filas placeholder.**      |
| `supabase/migrations/20261005120000_remove_unimplemented_games.sql` | —          | Borró `gloton`, `invasores`, `ranaria` y `duelo-pixel`; con `on delete cascade` se fueron sus `scores`.                 |
| `supabase/migrations/20261015120000_game_frogger.sql`               | —          | Última migración aplicada: `INSERT` de `frogger` con `sort_order: 5` (el hueco que la ficha 005 proponía para este id). |
| `ls lib/games/`                                                     | —          | `arkanoid`, `asteroids`, `frogger`, `snake`, `tetris`. **No hay motor `invasores`.**                                    |
| `app/globals.css:758`                                               | —          | `.cover-invaders` (+ `::after`) **ya existe y está huérfana**: 8 alienígenas verdes/magenta y cañón cian.               |
| `lib/games/registry.ts`                                             | —          | `GameEntry` ya tiene `engineLevel`, `hasLives`, `hasLines`, `blockStyles`, `aspect`, `hasSound`, `levelJump` y `touch`. |
| `lib/home-data.ts:50`                                               | —          | La actividad reciente ya dice `game: "Invasores"`: ninguna variante lo toca.                                            |
| `ls specs/`                                                         | —          | Specs `01`–`11` ocupados → **el siguiente libre es `12`**.                                                              |

**Consecuencia para la migración:** las tres variantes usan **`INSERT`**, no `UPDATE`. No queda ninguna fila placeholder que reemplazar (el precedente 07/08/09 no aplica) y **no hace falta `delete from public.scores`**: la FK ya cascadeó cuando la migración del 2026-10-05 borró la fila. `sort_order: 7` es el primer hueco realmente libre: el `5` que la ficha 005 reservaba lo ocupó `frogger`, y el `4` está comprometido con la jam de `gloton`.

## Identidad común a las tres variantes

Las tres son **el mismo juego**: misma ruta, misma fila de catálogo, mismo canvas, mismo mando. Sólo cambia el diseño del motor y, con él, el texto `long`.

| Campo        | Valor                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------- |
| `id`         | `invasores` (= ruta `/juegos/invasores`, carpeta `lib/games/invasores`)                         |
| `title`      | `INVASORES`                                                                                     |
| `short`      | `Defiende el planeta de filas alienígenas.` (del prototipo, `references/templates/data.jsx:51`) |
| `category`   | `SHOOTER`                                                                                       |
| `color`      | `green`                                                                                         |
| `cover`      | `cover-invaders` — **clase existente y huérfana**, se reutiliza; no se crea ninguna portada     |
| `sort_order` | `7`                                                                                             |
| Migración    | `INSERT` en `public.games`                                                                      |
| `long`       | **distinto por variante** (describe sólo las mecánicas que esa variante tiene)                  |
| Canvas       | **800×600** lógico, `aspect` por defecto `4 / 3` (no se declara en el registro)                 |
| Mando táctil | `touch: { dpad: ["left", "right"], buttons: [{ id: "a", label: "DISPARAR" }] }` en las tres     |
| Assets       | **Ninguno** en las tres: alienígenas, cañón y búnkeres se dibujan con rectángulos de píxeles    |

## Comparativa de las tres variantes

| Eje                   | **A — Mínima fiel**                                                                              | **B — Con twist «el delator»**                                                                                            | **C — De autor, la invasión completa**                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Enfoque               | El clásico jugable con el mínimo alcance: **una sola ola** de 55 invasores, 3 vidas, 4 búnkeres. | La base de A **más una** mecánica propia que cambia la fórmula de puntuación y añade una decisión de tiro.                | Reinterpretación completa: **5 olas**, nave nodriza, vida extra, audio sintetizado y salto de ola.                          |
| Mecánica diferencial  | Ninguna. Fidelidad al original: marcha en bloque, descenso al borde, bombas, coberturas.         | **El delator:** siempre hay exactamente un invasor marcado; matarlo vale **×5** y encadena. Matar a otro rompe la cadena. | Progresión por olas con tabla de dificultad, nodriza con tabla de valor por disparos, bonus de ola y vida extra a los 5000. |
| Puntuación            | Fila 1 = 30 · filas 2–3 = 20 · filas 4–5 = 10.                                                   | Lo mismo **×5 si el invasor está marcado**, más bonus final `cadena máxima × 100`.                                        | Lo mismo por ola · nodriza 50/100/150/300 (máx. 3 por ola) · bonus de ola `500 × ola`.                                      |
| Puntuación máxima     | **990**                                                                                          | **10 450** (55 muertes marcadas = 4950 + cadena 55 × 100 = 5500)                                                          | **16 950** (4950 invasores + 4500 nodrizas + 7500 bonus de ola)                                                             |
| Fin de partida        | 3 vidas a 0 · la formación toca `y = 520` · victoria al limpiar los 55.                          | 3 vidas a 0 · la formación toca `y = 520` · victoria al limpiar los 55.                                                   | Vidas a 0 (3 + 1 extra) · la formación toca `y = 520` · victoria al limpiar la ola 5.                                       |
| Campos de `GameEntry` | `engineLevel: false`, `hasLives: true`, `touch`                                                  | `engineLevel: false`, `hasLives: true`, **`hasChain: true`** (nuevo), `touch`                                             | `engineLevel: true`, `hasLives: true`, `hasSound: true`, `levelJump: 5`, `touch`                                            |
| Contrato              | **Sin cambios** (todo existe ya).                                                                | Amplía con `hasChain` + `onChain`, calcado de `hasLines`/`onLines` del SPEC 07; el HUD gana **CADENA**.                   | **Sin cambios** (reusa `hasSound`/`muted`/`volume`/`jumpTo` del SPEC 08).                                                   |
| Audio                 | Ninguno.                                                                                         | Ninguno.                                                                                                                  | **Sintetizado** con Web Audio API (marcha de 4 tonos + 4 efectos). Sin binarios en `public/`.                               |
| Módulos del motor     | `constants` · `entities` · `input` · `engine`                                                    | Los mismos 4.                                                                                                             | Los 4 **más** `levels.ts` y `audio.ts`.                                                                                     |
| Riesgo                | **Bajo.** Lo único fino es la máscara de celdas de los búnkeres.                                 | **Medio.** Toca `game-player.tsx` y `types.ts`, y el marcado puede quedar injusto si cae detrás de la formación.          | **Alto, declarado.** Audio sintetizado, tabla de la nodriza, 5 olas que balancear y salto de ola que permite farmear bonus. |
| Esfuerzo              | 10 pasos de plan.                                                                                | 11 pasos de plan.                                                                                                         | 13 pasos de plan.                                                                                                           |

## Recomendación

**B — «el delator».** Razón única: A es fiel pero su techo de **990** hace un leaderboard degenerado —toda partida perfecta empata en el mismo número, igual que ya pasa con Snake y sus 2520— mientras que B arregla exactamente eso con una sola regla que no toca la IA ni el balance del original: el techo pasa a **10 450** y la distancia entre una partida buena y una excelente deja de depender de sobrevivir y pasa a depender de **a quién disparas**, que es justo lo que un Salón de la Fama por puntos necesita.

Si lo que se busca es **cerrar rápido y sin tocar el contrato de `GameCanvasProps`**, A. Si hay apetito por el juego completo con olas, nodriza y sonido, C.

## Promoción (trabajo manual del usuario)

`/spec-impl` hace `ls specs/` sin recursión: **no ve** `specs/game-jam/`. Para construir una variante:

1. Elegir una de `specs/game-jam/invasores/A-juego-invasores.md`, `B-juego-invasores.md` o `C-juego-invasores.md`.
2. Copiarla a **`specs/12-juego-invasores.md`** (el `12` es el siguiente número libre comprobado con `ls specs/`).
3. Cambiar la cabecera a `Estado: Aprobado` y borrar la línea `Game jam:` y la línea `Al aprobar:`.
4. Ejecutar **`/spec-impl 12-juego-invasores`** (o `/spec-impl-game 12-juego-invasores` para encadenar `skin-designer` y `mobile-porter`).

Las tres variantes son implementables por separado: sólo una se construirá. Las otras dos quedan como registro de la jam.

Dudas abiertas y sus valores por defecto ya aplicados: `specs/game-jam/invasores/00-preguntas.md`.
