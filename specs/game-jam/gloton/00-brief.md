# Game jam — GLOTÓN: tres diseños del mismo juego

- **Fecha:** 2026-10-12
- **Tema recibido (literal):** «laberinto de persecución — un glotón recorre un laberinto comiendo puntos mientras cuatro espectros lo cazan, hasta que una píldora invierte los papeles».
- **Juego elegido:** **GLOTÓN** (`id: gloton`). El tema lo nombra explícitamente, así que se aplica la única excepción a la regla de no repetir candidatos del índice: **ficha 006** de `references/game-suggestions-todo.md` (2026-10-08 · Veredicto `Alternativa` · Estado `Sugerido`).
- **Qué ha cambiado respecto a la ficha 006:** petición directa del usuario. La ficha lo dejaba como «candidato natural para el turno siguiente, cuando haya apetito por un motor más ambicioso» y cedía el turno a la **ficha 005** (INVASORES, `Recomendado`). El usuario adelanta GLOTÓN; la 005 se queda en `Sugerido`, sin cambios. El veredicto técnico de la 006 sigue vigente y es el que estructura esta jam: la IA de los espectros es «el motor más caro y arriesgado de los evaluados», así que **cada variante declara exactamente cuánta IA implementa**.

## Estado del catálogo leído

| Fuente                                                              | Fecha      | Qué dice                                                                                                      |
| ------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| `references/catalogo-juegos.md` (snapshot)                          | 2026-10-06 | 4 juegos: `arkanoid`, `tetris`, `snake`, `asteroides`. No lista `sort_order`.                                 |
| Tabla `games` real (`select` de sólo lectura)                       | 2026-10-12 | `arkanoid` (1), `tetris` (2), `snake` (3), `asteroides` (6). **No hay filas placeholder.**                    |
| `supabase/migrations/20261005120000_remove_unimplemented_games.sql` | —          | Borró `gloton`, `invasores`, `ranaria` y `duelo-pixel`; con `on delete cascade` se fueron sus `scores`.       |
| `app/globals.css:716`                                               | —          | `.cover-glot` (+ `::after` y `::before`) **ya existe**: glotón amarillo, puntos cian y dos espectros.         |
| `lib/games/registry.ts`                                             | —          | `GameEntry` ya tiene `aspect`, `hasLives`, `engineLevel`, `hasSound`, `levelJump`, `hasLines`, `blockStyles`. |
| `lib/home-data.ts:49`                                               | —          | La actividad reciente ya dice `game: "Glotón"`: ninguna variante lo toca.                                     |
| `ls specs/`                                                         | —          | Specs `01`–`09` ocupados → **el siguiente libre es `10`**.                                                    |

**Consecuencia para la migración:** las tres variantes usan **`INSERT`**, no `UPDATE` de placeholder. No queda ninguna fila placeholder que reemplazar (precedente 07/08/09 no aplica aquí) y **no hace falta `delete from public.scores`**, porque la FK `scores.game_id` ya cascadeó cuando se borró la fila en la migración del 2026-10-05. `sort_order: 4` está libre y es el hueco que el prototipo reservaba para este juego.

## Identidad común a las tres variantes

Las tres son **el mismo juego**: misma ruta, misma fila de catálogo, mismo HUD base. Sólo cambia el diseño del motor y, con él, el texto `long`.

| Campo        | Valor                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------- |
| `id`         | `gloton` (= ruta `/juegos/gloton`, carpeta `lib/games/gloton`)                                 |
| `title`      | `GLOTÓN`                                                                                       |
| `short`      | `Devora puntos y escapa de los fantasmas.` (del prototipo, `references/templates/data.jsx:43`) |
| `category`   | `ARCADE`                                                                                       |
| `color`      | `yellow`                                                                                       |
| `cover`      | `cover-glot` — **clase existente**, se reutiliza; no se crea ninguna portada                   |
| `sort_order` | `4`                                                                                            |
| Migración    | `INSERT` en `public.games`                                                                     |
| `long`       | **distinto por variante** (describe sólo las mecánicas que esa variante tiene)                 |
| Canvas       | 28×31 celdas × `CELL = 20` px → **560×620** lógico, `aspect: "28 / 31"`                        |

## Comparativa de las tres variantes

| Eje                   | **A — Mínima fiel**                                                                                                                                                    | **B — Con twist «eco de la píldora»**                                                                                            | **C — De autor, el cuarteto**                                                                                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enfoque               | El clásico jugable con el mínimo alcance: un laberinto, una regla de IA.                                                                                               | La base de A **más una** mecánica propia que cambia la fórmula de puntuación.                                                    | Reinterpretación completa: progresión, personalidades, audio.                                                                                                                                      |
| IA de los espectros   | **Una sola regla** para los cuatro: distancia euclídea al glotón en intersecciones, sin giro de 180°. Diferencias: color y retardo de salida (0/3/6/9 s). Sin scatter. | Idéntica a A (deliberadamente): el presupuesto se gasta en el twist, no en la IA.                                                | **Cuarteto con personalidades** (perseguidor, emboscador, flanqueador, tímido) + máquina `scatter/chase/frightened` con horario por nivel, salida por contador de puntos y ralentización en túnel. |
| Mecánica diferencial  | Ninguna: inversión fija de 6 s por píldora.                                                                                                                            | **Eco recargable:** cada espectro devorado suma +1,5 s a la inversión (tope 12 s) y **la cadena no se reinicia entre píldoras**. | Progresión: **5 niveles** sobre 2 trazados, frutas, bonus de nivel y de perfección, vida extra a los 10 000.                                                                                       |
| Puntuación            | Punto 10 · píldora 50 · espectros 200/400/800/1600 (reinicio por píldora).                                                                                             | Punto 10 · píldora 50 · espectros **200/400/800/1600/3200/6400/12 800** (tope 12 800), cadena por eco.                           | Punto 10 · píldora 50 · espectros 200/400/800/1600 · fruta 100–1000 · nivel limpio `1000 × nivel` · perfecto +2000.                                                                                |
| Puntuación máxima     | **14 600**                                                                                                                                                             | **143 200** (teórico, cadena de 16 espectros) · 14 600 jugando sin encadenar                                                     | **103 200** (17 800 + 19 200 + 20 600 + 22 000 + 23 600)                                                                                                                                           |
| Fin de partida        | 3 vidas a 0, o limpiar los 244 comestibles (victoria).                                                                                                                 | 3 vidas a 0, o limpiar los 244 comestibles (victoria).                                                                           | Vidas a 0 (3 + 1 extra), o limpiar el nivel 5 (victoria).                                                                                                                                          |
| Campos de `GameEntry` | `engineLevel: false`, `hasLives: true`, `aspect: "28 / 31"`                                                                                                            | `engineLevel: false`, `hasLives: true`, **`hasChain: true`** (nuevo), `aspect: "28 / 31"`                                        | `engineLevel: true`, `hasLives: true`, `hasSound: true`, `levelJump: 5`, `aspect: "28 / 31"`                                                                                                       |
| Contrato              | **Sin cambios** (todo existe ya).                                                                                                                                      | Amplía con `hasChain` + `onChain`, calcado de `hasLines`/`onLines` del SPEC 07; HUD gana **CADENA**.                             | **Sin cambios** (reusa `hasSound`/`muted`/`volume`/`jumpTo` del SPEC 08).                                                                                                                          |
| Assets / audio        | Ninguno. Todo geometría de canvas.                                                                                                                                     | Ninguno. Todo geometría de canvas.                                                                                               | Ninguno **en archivo**: audio **sintetizado** con Web Audio API (5 efectos + sirena).                                                                                                              |
| Módulos del motor     | `constants` · `levels` · `entities` · `input` · `engine`                                                                                                               | Los mismos 5.                                                                                                                    | Los 5 **más** `ai.ts` y `audio.ts`.                                                                                                                                                                |
| Riesgo                | **Bajo.** El laberinto a mano es el único punto fino.                                                                                                                  | **Medio.** El eco puede desbalancear (trivializar la caza) y toca `game-player.tsx`.                                             | **Alto, declarado.** Es el motor más caro del catálogo: IA del cuarteto, horario por nivel, 2 trazados, audio.                                                                                     |
| Esfuerzo              | 11 pasos de plan.                                                                                                                                                      | 12 pasos de plan.                                                                                                                | 13 pasos de plan, con la IA partida en dos pasos jugables.                                                                                                                                         |

## Recomendación

**B — «eco de la píldora».** Razón única: es la que mejor cumple el tema («hasta que una píldora invierte los papeles») **convirtiéndolo en una decisión de juego** —¿muerdes la píldora siguiente ahora para alargar la caza, o la guardas?— sin pagar el riesgo que la ficha 006 identificó, porque mantiene la IA recortada de A y gasta el presupuesto en la mecánica que separa una buena partida (14 600) de una excelente (143 200), que es justo lo que un leaderboard por puntos necesita.

Si lo que se busca es **cerrar rápido y sin sorpresas**, A. Si lo que se busca es **el juego completo** y hay apetito por el motor que la ficha 006 anunciaba, C.

## Promoción (trabajo manual del usuario)

`/spec-impl` hace `ls specs/` sin recursión: **no ve** `specs/game-jam/`. Para construir una variante:

1. Elegir una de `specs/game-jam/gloton/A-juego-gloton.md`, `B-juego-gloton.md` o `C-juego-gloton.md`.
2. Copiarla a **`specs/10-juego-gloton.md`** (el `10` es el siguiente número libre comprobado con `ls specs/`).
3. Cambiar la cabecera a `Estado: Aprobado` y borrar la línea `Game jam:` y la línea `Al aprobar:`.
4. Ejecutar **`/spec-impl 10-juego-gloton`**.

Las tres variantes son implementables por separado: sólo una se construirá. Las otras dos quedan como registro de la jam.

Dudas abiertas y sus valores por defecto ya aplicados: `specs/game-jam/gloton/00-preguntas.md`.
