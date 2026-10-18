# INVASORES — variante A: mínima fiel

- **Estado:** Borrador
- **Depende de:** SPEC 05, SPEC 06, SPEC 10
- **Fecha:** 2026-10-17
- **Game jam:** tema «elige un juego ya registrado y no implementado de `references/game-suggestions-todo.md`» · variante A de 3 · hermanas `B-juego-invasores.md`, `C-juego-invasores.md`
- **Al aprobar:** poner `Estado: Aprobado`, copiar a `specs/NN-juego-invasores.md` y ejecutar `/spec-impl NN-juego-invasores`

**Objetivo:** Crear un Space Invaders clásico de **una sola ola** en un módulo TypeScript jugable en `/juegos/invasores/jugar`, con fila nueva en el catálogo y leaderboard en Supabase.

## Por qué existe este spec

No hay código original que portar: `references/started-games/` sólo contiene `02-asteroids`, `03-tetris` y `04-arkanoid`, los tres ya portados. Las reglas, constantes, puntuación y dibujo de esta variante se **definen aquí** (decisiones de la jam, derivadas del Space Invaders de 1978 y de la ficha 005 de `references/game-suggestions-todo.md`), no se extraen de un `game.js`. Por eso las constantes de la sección Alcance son la **fuente de verdad** para `/spec-impl`, igual que en `specs/09-juego-snake.md`.

## Alcance

**Incluido:**

1. **Catálogo** — fila **nueva** en `games` (`INSERT`, no `UPDATE`: la migración `20261005120000_remove_unimplemented_games.sql` borró el placeholder `invasores` y sus `scores` por cascada, así que no queda nada que renombrar). Migración `supabase/migrations/<timestamp>_game_invasores.sql` aplicada con `apply_migration`:
   - `id: "invasores"`, `title: "INVASORES"`, `category: "SHOOTER"`, `color: "green"`, `cover: "cover-invaders"` (clase existente y hoy huérfana en `app/globals.css:758`; **no se crea portada nueva**), `sort_order: 7` (1, 2, 3, 5 y 6 están ocupados; el 4 está comprometido con la jam de `gloton`).
   - `short`: `Defiende el planeta de filas alienígenas.` (texto del prototipo, `references/templates/data.jsx:51`).
   - `long` describe **sólo** lo que esta variante tiene: una formación de 55 invasores, 3 vidas, 4 búnkeres que se deshacen y 10/20/30 puntos por fila. **No menciona** olas, niveles, nave nodriza, sonido ni vidas extra.
   - `lib/home-data.ts` ya dice `game: "Invasores"` (línea 50): no se toca.
2. **Motor** en `lib/games/invasores/`: `constants.ts`, `entities.ts`, `input.ts`, `engine.ts`.
   - Sin globals de módulo con estado ni `document.getElementById`; las funciones de dibujo reciben `ctx`. El motor no toca `localStorage` ni el DOM fuera del `canvas` recibido.
   - API: `createInvadersGame(canvas, callbacks)` → `{ start, pause, resume, restart, destroy }`.
   - Callbacks: `onScore(score)`, `onLives(lives)`, `onGameOver(finalScore)`, `onTogglePause()`. **Sin** `onLevel`.
   - Loop `requestAnimationFrame` con `dt` ≤ 50 ms; acumulador de tiempo para la marcha de la formación (paso discreto, no interpolado). `destroy()` cancela rAF, quita los listeners de teclado y la suscripción al mando virtual.
   - **Constantes** (canvas lógico **800×600**):
     - Formación: `COLS = 11`, `ROWS = 5`, `ALIEN_W = 32`, `ALIEN_H = 24`, `GAP_X = 16`, `GAP_Y = 16` → bloque de 512×184 px. Origen `FORM_X = 144` (centrado), `FORM_Y = 80`.
     - Marcha: paso discreto horizontal `STEP_X = 8` px cada `stepMs = 80 + 13 × (vivos − 1)` ms → 782 ms con los 55 vivos, 80 ms con el último. Al tocar `x < 16` o `x + ALIEN_W > 784` cualquier invasor vivo: el **bloque entero** baja `STEP_Y = 16` px e invierte el sentido en el paso siguiente.
     - Animación: cada paso alterna entre los dos fotogramas del sprite de cada fila (patas dentro / patas fuera), dibujados con rectángulos.
     - Superficie `SURFACE_Y = 520`: si el borde inferior de cualquier invasor vivo llega a 520, la partida termina en derrota inmediata (sin descontar vidas).
     - Cañón: 44×20 px, `CANNON_Y = 540`, `CANNON_SPEED = 300` px/s, `x` limitado a `[16, 740]`, arranca centrado en `x = 378`.
     - Disparo del jugador: 4×14 px, `SHOT_SPEED = 520` px/s hacia arriba, **uno solo en pantalla** (regla del original: no se puede volver a disparar hasta que el anterior impacte o salga).
     - Bombas: 6×14 px, `BOMB_SPEED = 180` px/s hacia abajo, **máximo 2 simultáneas**, una cada `BOMB_MS = 900` ms si hay hueco. La lanza un invasor vivo elegido al azar entre los **más bajos de cada columna** (ningún invasor dispara a través de un compañero).
     - Búnkeres: 4, cada uno una rejilla de `BUNKER_COLS = 12` × `BUNKER_ROWS = 8` celdas de 6×6 px (72×48 px). `BUNKER_Y = 440`; `x` en `92`, `268`, `444`, `620`. Perfil inicial: se vacían las celdas de las dos esquinas superiores en escalón (2+1 celdas por lado) y el arco de la base (columnas 4–7, filas 6–7).
     - Vidas: `LIVES = 3`. Al perder una, 1000 ms de pausa de respawn en los que se borran todos los proyectiles y el cañón vuelve al centro; la formación no avanza durante la pausa.
   - **Reglas:**
     - La partida arranca en movimiento: `start()` pone la formación a marchar.
     - Impacto de un disparo en un invasor: ese invasor desaparece, el disparo se consume, suma puntos y la marcha se acelera porque bajan los vivos. Explosión de 150 ms en su lugar.
     - Impacto de un disparo o de una bomba en una celda de búnker: se destruyen esa celda y sus 4 vecinas ortogonales, y el proyectil se consume.
     - Disparo y bomba se **cruzan sin interactuar** (en esta variante no hay intercepción).
     - Bomba que alcanza el cañón: −1 vida, explosión de 600 ms, respawn. Con 0 vidas → `onGameOver(score)`.
     - **Puntuación:** fila 1 (la superior) **30** puntos, filas 2 y 3 **20**, filas 4 y 5 **10**. Nada más puntúa.
     - **Puntuación máxima alcanzable: 990** (`11 × 30 + 22 × 20 + 22 × 10`), dentro de `0–9 999 999`.
     - **Fin de partida (inequívoco):** (a) vidas a 0, (b) la formación alcanza `SURFACE_Y`, (c) victoria al eliminar los 55. Los tres llaman a `onGameOver(score)` **una sola vez**; después el canvas queda congelado en el último estado.
   - **Dibujo en canvas** (sólo lo que el HUD React no puede mostrar): invasores con sus dos fotogramas por fila (3 diseños, uno por valor), cañón, disparo, bombas, búnkeres celda a celda, explosiones y la **línea de superficie** verde en `y = 520`. Sin texto de puntuación, sin vidas dibujadas, sin overlays.
   - Sin audio.
3. **Componente cliente** `components/invasores-canvas.tsx` (`"use client"`), mismo patrón que `components/snake-canvas.tsx` y `components/frogger-canvas.tsx`: callbacks vía ref, props `paused` y `restartKey`, `onAutoPause` con `visibilitychange`, seguro con Strict Mode. Canvas lógico fijo **800×600** escalado por CSS dentro de `.crt-screen` con el aspecto por defecto `4 / 3` (no se declara `aspect`).
4. **Registro y reproductor** — `lib/games/registry.ts` añade la entrada `invasores` **sin cambios en el contrato** (`GameEntry` y `GameCanvasProps` ya tienen todo lo necesario):
   - HUD: puntuación y **vidas** (`hasLives: true`). `engineLevel: false` → el HUD muestra el nivel derivado `floor(score / 2500) + 1`, que aquí siempre es `01` porque el techo es 990; aceptado, sin tocar `game-player.tsx` (mismo acuerdo que `snake`).
   - Sin chip de sonido, sin salto de nivel, sin selector de estilo de bloque.
   - Mando táctil: `touch: { dpad: ["left", "right"], buttons: [{ id: "a", label: "DISPARAR" }] }`, sobre el canal `VirtualPad` del SPEC 10.
5. **Controles:**
   - `←`/`→` y `A`/`D` mueven el cañón; `ESPACIO` dispara; `P` o `Escape` alternan PAUSA/REANUDAR vía `onTogglePause`.
   - En táctil: cruz izquierda/derecha y botón **A** (DISPARAR), leídos desde `pad` en `input.ts`.
   - `preventDefault` sólo en flechas, `A`, `D` y `Space` (no en `P` ni `Escape`). Se ignoran las teclas con el foco en `input`/`textarea` y las que llevan `Ctrl`/`Meta`/`Alt`. Con la partida pausada o terminada, movimiento y disparo no actúan; `P`/`Escape` alternan la pausa salvo tras el fin.
   - Texto de controles bajo el CRT: `← → / AD mover · ESPACIO disparar · P pausa`.
6. **Leaderboard** — sin cambios de esquema: guardado con `submitScore({ gameId: "invasores", name, score })` y lectura por `game_id` en el Salón (`/salon?juego=invasores`), detalle y cards. Estado vacío con 0 partidas y revalidación ya cubiertos por el SPEC 06; aquí sólo se verifica.
7. **Pulido visual** con `/frontend-design`: paleta de las filas (verde, magenta, cian coherentes con `.cover-invaders`), glow de los invasores, búnkeres, explosiones, hint de controles y overlay de pausa.
8. `get_advisors` al cierre. `database.types.ts` no se regenera (el esquema no cambia).

**No incluido (fuera de alcance de este spec):**

- Olas sucesivas, niveles, dificultad creciente entre partidas, salto de nivel (`levelJump`).
- Nave nodriza / platillo de bonus.
- Audio de cualquier tipo (y por tanto chip `SONIDO` y slider de volumen).
- Intercepción de bombas con el disparo del jugador, invasores marcados, multiplicadores o cadenas.
- Vidas extra por puntuación, bonus por vidas restantes, bonus por victoria.
- Búnkeres que se reparan o que resisten varios impactos por celda.
- Sprites en imagen: todo se dibuja con rectángulos; no hay nada en `public/games/invasores/`.
- Pantalla completa, guardado de partida en curso.
- Auth, anti-trampas, rate limit, scores ligados a usuario.
- Los demás juegos del catálogo (Glotón, Duelo Pixel, Columnas).
- Pruebas automatizadas (no hay test runner).
- Nueva portada: se reutiliza `.cover-invaders`.

## Modelo de datos

Migración (valores reales; respeta los `CHECK` de `games`). Es un `INSERT`: no hay fila previa ni `scores` que borrar, porque la migración del 2026-10-05 ya los eliminó por cascada.

```sql
insert into public.games (id, title, short, long, category, color, cover, sort_order)
values (
  'invasores',
  'INVASORES',
  'Defiende el planeta de filas alienígenas.',
  'Una formación de 55 alienígenas marcha de lado a lado y baja un escalón cada vez que toca el borde. Mueve tu cañón en horizontal, dispara de uno en uno y cúbrete tras cuatro búnkeres que se deshacen impacto a impacto. Cada fila vale distinto: 30 puntos la de arriba, 20 las dos siguientes y 10 las dos de abajo. Tienes 3 vidas y pierdes si la formación toca la superficie.',
  'SHOOTER',
  'green',
  'cover-invaders',
  7
);
```

Tipos públicos del motor:

```ts
export type InvasoresCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onGameOver: (finalScore: number) => void; // vidas a 0, superficie alcanzada o victoria
  onTogglePause: () => void;
};

export type InvasoresGame = {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void; // cancela rAF, quita listeners de teclado y desuscribe el pad
};

export type Alien = { col: number; row: number; alive: boolean }; // x/y se derivan del origen de la formación
export type Shot = { x: number; y: number; vy: number };
export type Bunker = { x: number; y: number; cells: boolean[][] }; // [row][col], 8 × 12
export type Phase = "playing" | "respawn" | "over";
```

Entrada del registro:

```ts
invasores: {
  Canvas: InvasoresCanvas,
  controls: [
    { keys: ["←", "→"], label: "mover" },
    { keys: ["AD"], label: "mover" },
    { keys: ["ESPACIO"], label: "disparar" },
    { keys: ["P"], label: "pausa" },
  ],
  engineLevel: false,
  hasLives: true,
  blockStyles: BLOCK_STYLES,
  touch: {
    dpad: ["left", "right"],
    buttons: [{ id: "a", label: "DISPARAR" }],
  },
},
```

Archivos:

```
supabase/migrations/<timestamp>_game_invasores.sql   // nuevo: INSERT de la fila
lib/games/invasores/constants.ts                     // nuevo: formación, marcha, cañón, proyectiles, búnkeres, puntos por fila, colores
lib/games/invasores/entities.ts                      // nuevo: formación, cañón, proyectiles, búnkeres con máscara de celdas, colisiones AABB, dibujo
lib/games/invasores/input.ts                         // nuevo: teclado + VirtualPad, attach/detach
lib/games/invasores/engine.ts                        // nuevo: createInvadersGame
components/invasores-canvas.tsx                      // nuevo
lib/games/registry.ts                                // modificado: entrada invasores
app/globals.css                                      // modificado sólo si el pulido lo requiere (hint de controles)
references/catalogo-juegos.md                        // modificado: añadir la fila al snapshot
```

## Plan de implementación

1. **Guía y estado base** — leer en `node_modules/next/dist/docs/` Client Components y rutas dinámicas de Next 16; confirmar con `list_tables`/`select` que `games` no tiene fila `invasores` y que `sort_order: 7` sigue libre; revisar `.cover-invaders` en `app/globals.css`.
2. **Migración del catálogo** — SQL en `supabase/migrations/` + `apply_migration`. Verificar `/juegos/invasores` con la portada `cover-invaders`, que la card aparece en biblioteca y home, y que el leaderboard está vacío. El reproductor todavía muestra el placeholder simulado.
3. **Constantes** — portar a TypeScript estricto todos los números de la sección Alcance, incluidos los puntos por fila y las posiciones de los búnkeres.
4. **Entidades** — formación con origen y offset (los invasores guardan `col`/`row`, no `x`/`y`), cañón, proyectiles, búnkeres con máscara `boolean[8][12]` y perfil inicial recortado, colisiones AABB, destrucción de celda + 4 vecinas, dibujo de todo con `ctx` por parámetro.
5. **Input** — `attachInput(canvas, pad)` que devuelve su limpieza; teclado y `VirtualPad`; `preventDefault` sólo en las teclas del juego; ignora `input`/`textarea` y modificadores.
6. **Motor** — estado en closure (`playing`/`respawn`/`over`), acumulador de pasos con `dt` ≤ 50 ms, marcha en bloque con inversión y descenso, un disparo a la vez, bombas desde los invasores más bajos, callbacks sólo en cambios reales, una sola salida de fin, `pause`/`resume`/`restart`/`destroy`.
7. **Componente `InvasoresCanvas`** — montaje en `useEffect`, Strict Mode, `visibilitychange`, escalado 800×600, `pad`.
8. **Registro y reproductor (jugable)** — añadir la entrada `invasores`. Verificar partida completa y que `asteroides`, `tetris`, `arkanoid`, `snake` y `frogger` siguen igual.
9. **Pulido y verificación manual** — con `/frontend-design`; partida completa (mover, disparar, deshacer un búnker, morir por bomba, perder por superficie, ganar limpiando los 55), guardar iniciales, ver la marca en Salón, detalle y card, jugar de nuevo, salir y volver, escritorio y ancho móvil con el mando táctil. Capturas en `.playwright-screenshot`. Actualizar `references/catalogo-juegos.md`.
10. **Cierre** — `get_advisors`, `npm run lint`, `npm run build`, `git status`; borrar con `execute_sql` las filas de prueba de `scores` con `game_id = 'invasores'`.

## Criterios de aceptación

- [ ] `/juegos/invasores/jugar` muestra el juego dentro del marco CRT con proporción 4/3 y canvas lógico 800×600.
- [ ] Al arrancar hay 55 invasores en 5 filas × 11 columnas, bloque de 512×184 px con esquina superior izquierda en `(144, 80)`, el cañón centrado en `x = 378`, `y = 540`, y 4 búnkeres intactos en `x = 92, 268, 444, 620`, `y = 440`.
- [ ] La formación avanza 8 px por paso; el paso dura 782 ms con los 55 vivos y 80 ms con uno solo; al tocar el borde baja 16 px e invierte el sentido en bloque.
- [ ] `←`/`→` y `A`/`D` mueven el cañón a 300 px/s sin salir de `[16, 740]`; la página no hace scroll con esas teclas ni con `ESPACIO`.
- [ ] Sólo hay un disparo del jugador en pantalla: pulsar `ESPACIO` con un disparo activo no crea otro.
- [ ] Un invasor de la fila superior suma exactamente 30 puntos, uno de las filas 2 o 3 suma 20 y uno de las filas 4 o 5 suma 10; nada más suma puntos.
- [ ] Limpiar los 55 invasores abre el modal "FIN DEL JUEGO" con exactamente 990 puntos.
- [ ] Como máximo hay 2 bombas en pantalla, salen de los invasores más bajos de su columna y aparecen a lo sumo cada 900 ms.
- [ ] Un impacto en un búnker borra la celda alcanzada y sus 4 vecinas ortogonales, consume el proyectil y es visible en el dibujo; los búnkeres no se reparan.
- [ ] Disparo y bomba se cruzan sin destruirse.
- [ ] Una bomba en el cañón resta una vida, muestra la explosión, limpia los proyectiles y reaparece el cañón centrado tras 1 s; con 0 vidas abre el modal "FIN DEL JUEGO".
- [ ] Que el borde inferior de un invasor llegue a `y = 520` abre el modal "FIN DEL JUEGO" de inmediato, con las vidas que queden.
- [ ] El modal de fin se abre **una sola vez** por partida en las tres condiciones; el botón FIN también lo abre.
- [ ] El HUD React muestra puntuación y vidas del motor en tiempo real y nivel `01`; el canvas no dibuja puntuación, vidas ni overlays.
- [ ] No hay audio ni chip `SONIDO` en Invasores.
- [ ] PAUSA congela formación, proyectiles y temporizadores, y REANUDAR continúa sin saltos ni pasos extra; `P` y `Escape` alternan; cambiar de pestaña pausa. Con el modal abierto `P`/`Escape` no hacen nada.
- [ ] En móvil aparece el mando con cruz izquierda/derecha y botón DISPARAR, y el juego es jugable sólo con él.
- [ ] Guardar iniciales válidas crea una fila en `scores` con `game_id: "invasores"`; iniciales inválidas se rechazan sin cerrar el modal.
- [ ] La marca aparece en `/salon?juego=invasores`, en el sidebar del detalle y en `best`/`plays` de la card.
- [ ] Sin partidas: estado vacío en Salón y detalle.
- [ ] JUGAR DE NUEVO reinicia score 0, 3 vidas, los 55 invasores, los 4 búnkeres y el cañón centrado, sin duplicar loop ni listeners; Strict Mode sin duplicados ni errores en consola.
- [ ] `asteroides`, `tetris`, `arkanoid`, `snake` y `frogger` conservan comportamiento y HUD.
- [ ] `games` contiene la fila `invasores` con `title: INVASORES`, `category: SHOOTER`, `color: green`, `cover: cover-invaders`, `sort_order: 7`, y respeta los `CHECK`.
- [ ] El canvas escala en móvil sin desbordar y mantiene la proporción 4/3.
- [ ] `get_advisors` sin problemas críticos nuevos; `npm run lint` y `npm run build` pasan.

## Decisiones tomadas y descartadas

- **Sí:** `INSERT` de una fila nueva en `games` — la migración `20261005120000_remove_unimplemented_games.sql` borró el placeholder `invasores` y sus `scores` por cascada, así que no queda nada que actualizar. **No:** `UPDATE` de un placeholder (el precedente de 07/08/09 no aplica: la tabla real sólo tiene las 5 filas de juegos implementados) ni `delete from public.scores` previo (sería un no-op).
- **Sí:** `sort_order: 7`. **No:** el `5` que proponía la ficha 005 (lo ocupó `frogger` en `20261015120000_game_frogger.sql`) ni el `4` (comprometido con la jam de `gloton`).
- **Sí:** reutilizar `.cover-invaders`, que ya existe en `app/globals.css:758` y hoy está huérfana. **No:** crear `.cover-invasores` (duplicaría un diseño ya hecho).
- **Sí:** una sola ola, aceptando un techo de **990** puntos. **No:** olas sucesivas ni dificultad creciente — son el eje de la variante C; aquí romperían el objetivo de alcance mínimo. Se asume la consecuencia: toda partida perfecta empata en 990, igual que Snake empata en 2520.
- **Sí:** puntuación clásica 30/20/20/10/10 por fila. **No:** puntos por búnker, por tiempo o por vidas restantes (mecánica nueva).
- **Sí:** un único disparo del jugador en pantalla, como el original de 1978. **No:** disparo automático ni ráfaga (cambiaría por completo el ritmo y la dificultad).
- **Sí:** velocidad de marcha en función de los invasores vivos (`80 + 13 × (vivos − 1)` ms). **No:** velocidad fija (pierde la aceleración que es la firma del juego).
- **Sí:** derrota inmediata si la formación toca `y = 520`, sin descontar vidas. **No:** restar una vida y continuar (la formación ya estaría dentro de los búnkeres y la partida sería injugable).
- **Sí:** búnkeres como máscara de celdas 12×8 de 6×6 px con destrucción de celda + 4 vecinas. **No:** `ImageData` por píxel (más caro de leer/escribir cada frame y difícil de reiniciar) ni búnkeres con contador de impactos (no se verían deshacer).
- **Sí:** disparo y bomba se cruzan sin interactuar, como el original. **No:** intercepción — es territorio de otra variante.
- **Sí:** invasores, cañón y búnkeres dibujados con rectángulos en código. **No:** spritesheet en `public/` (la ficha 005 ya descartó los assets: el pixel art de esta era se escribe con rectángulos).
- **Sí:** `engineLevel: false` y aceptar que el HUD muestra nivel `01`. **No:** tocar `game-player.tsx` para ocultar el nivel (mismo acuerdo que `snake`; cambio de contrato fuera de alcance).
- **Sí:** mando táctil `left`/`right` + botón A con el canal `VirtualPad` del SPEC 10. **No:** cruz completa de 4 direcciones (el cañón no sube ni baja).
- **Sí:** tope de `dt` de 50 ms y acumulador de pasos. **No:** `setInterval` (se desincroniza con la pausa y el `visibilitychange`).
- **Sí:** motor TypeScript con `createInvadersGame(canvas, callbacks)` — sin globals, limpieza al desmontar. **No:** `iframe` ni `next/script`.
- **Sí:** HUD y modal de fin en React. **No:** HUD ni overlays dibujados en canvas.
- **Sí:** guardado con `submitScore` existente y `games` como fuente del catálogo. **No:** tablas por juego ni `localStorage` para scores.

## Riesgos identificados

| Riesgo                                                            | Mitigación                                                                                                          |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Strict Mode duplica loop o listeners                              | `destroy()` completo (rAF, teclado y desuscripción del pad); criterio de aceptación explícito.                      |
| Teclas del juego interfieren con el input del modal               | Ignorar eventos con target `input`/`textarea` y con modificadores; pausar al abrir el modal.                        |
| `dt` grande al volver a la pestaña                                | Tope de 50 ms y pausa con `visibilitychange`.                                                                       |
| Techo de 990 puntos hace que todas las partidas perfectas empaten | Aceptado y declarado; el desempate del Salón es por `created_at` ascendente (SPEC 06). La variante B lo resuelve.   |
| La máscara de celdas de los búnkeres cuesta de afinar visualmente | Perfil inicial definido por constantes (esquinas en escalón y arco de base) y verificado por captura en el paso 9.  |
| Colisión contra 4 × 96 celdas cada frame puede ser costosa        | Filtrar antes por el AABB del búnker completo; sólo entonces recorrer celdas.                                       |
| La formación "baja" dos veces si varios invasores tocan el borde  | El descenso se decide una vez por paso sobre el AABB del bloque, no por invasor.                                    |
| El último invasor a 80 ms/paso resulta injugable                  | Es el comportamiento del original; se verifica a mano en el paso 9 y, si hace falta, se ajusta el `13` del cálculo. |
| Scores falsos con clave publishable                               | Aceptado hasta el spec de Auth; `CHECK`s de formato y rango.                                                        |
| Un solo proyecto Supabase para dev y prod                         | Limpiar filas de prueba de `scores` al cerrar (paso 10).                                                            |
| Un `id`/slug distinto del `id` de `games` rompe la ruta           | La fila, la ruta `/juegos/invasores` y la carpeta `lib/games/invasores` usan el mismo slug.                         |
| Ampliar el registro rompe los cinco juegos existentes             | No se toca el contrato; el paso 8 y un criterio de aceptación los verifican.                                        |
| `sort_order: 7` deja de estar libre si otra rama inserta antes    | El paso 1 lo reconfirma con un `select` antes de escribir la migración.                                             |

## Qué **no** está en este spec

- Olas, niveles, salto de nivel y dificultad creciente.
- Nave nodriza y vidas extra.
- Audio de cualquier tipo.
- Intercepción de bombas, invasores marcados, multiplicadores y cadenas.
- Búnkeres reparables o con resistencia por celda.
- Sprites en imagen y cualquier archivo en `public/games/invasores/`.
- Pantalla completa y guardado de partida.
- Auth/anti-trampas y scores ligados a usuario.
- Los demás juegos del catálogo.
- Pruebas automatizadas.
