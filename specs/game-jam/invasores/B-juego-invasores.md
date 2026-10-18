# INVASORES — variante B: con twist «el delator»

- **Estado:** Borrador
- **Depende de:** SPEC 05, SPEC 06, SPEC 07, SPEC 10
- **Fecha:** 2026-10-17
- **Game jam:** tema «elige un juego ya registrado y no implementado de `references/game-suggestions-todo.md`» · variante B de 3 · hermanas `A-juego-invasores.md`, `C-juego-invasores.md`
- **Al aprobar:** poner `Estado: Aprobado`, copiar a `specs/NN-juego-invasores.md` y ejecutar `/spec-impl NN-juego-invasores`

**Objetivo:** Crear un Space Invaders de una ola en `/juegos/invasores/jugar` en el que siempre hay **un invasor marcado** que vale cinco veces su fila y encadena bonus, con fila nueva en el catálogo y leaderboard en Supabase.

## Por qué existe este spec

No hay código original que portar: `references/started-games/` sólo contiene `02-asteroids`, `03-tetris` y `04-arkanoid`, los tres ya portados. Las reglas, constantes, puntuación y dibujo de esta variante se **definen aquí** (decisiones de la jam, derivadas del Space Invaders de 1978 y de la ficha 005 de `references/game-suggestions-todo.md`), no se extraen de un `game.js`. La mecánica del **delator** es original de esta jam. Por eso las constantes de la sección Alcance son la **fuente de verdad** para `/spec-impl`, igual que en `specs/09-juego-snake.md`.

## Alcance

**Incluido:**

1. **Catálogo** — fila **nueva** en `games` (`INSERT`, no `UPDATE`: la migración `20261005120000_remove_unimplemented_games.sql` borró el placeholder `invasores` y sus `scores` por cascada, así que no queda nada que renombrar). Migración `supabase/migrations/<timestamp>_game_invasores.sql` aplicada con `apply_migration`:
   - `id: "invasores"`, `title: "INVASORES"`, `category: "SHOOTER"`, `color: "green"`, `cover: "cover-invaders"` (clase existente y hoy huérfana en `app/globals.css:758`; **no se crea portada nueva**), `sort_order: 7` (1, 2, 3, 5 y 6 están ocupados; el 4 está comprometido con la jam de `gloton`).
   - `short`: `Defiende el planeta de filas alienígenas.` (texto del prototipo, `references/templates/data.jsx:51`).
   - `long` describe **sólo** lo que esta variante tiene: formación de 55 invasores, 3 vidas, 4 búnkeres, 10/20/30 por fila, **invasor marcado que vale ×5** y bonus de cadena. **No menciona** olas, niveles, nave nodriza, sonido ni vidas extra.
   - `lib/home-data.ts` ya dice `game: "Invasores"` (línea 50): no se toca.
2. **Motor** en `lib/games/invasores/`: `constants.ts`, `entities.ts`, `input.ts`, `engine.ts`.
   - Sin globals de módulo con estado ni `document.getElementById`; las funciones de dibujo reciben `ctx`. El motor no toca `localStorage` ni el DOM fuera del `canvas` recibido.
   - API: `createInvadersGame(canvas, callbacks)` → `{ start, pause, resume, restart, destroy }`.
   - Callbacks: `onScore(score)`, `onLives(lives)`, `onChain(chain)`, `onGameOver(finalScore)`, `onTogglePause()`. **Sin** `onLevel`.
   - Loop `requestAnimationFrame` con `dt` ≤ 50 ms; acumulador de tiempo para la marcha de la formación (paso discreto, no interpolado). `destroy()` cancela rAF, quita los listeners de teclado y la suscripción al mando virtual.
   - **Constantes base** (canvas lógico **800×600**):
     - Formación: `COLS = 11`, `ROWS = 5`, `ALIEN_W = 32`, `ALIEN_H = 24`, `GAP_X = 16`, `GAP_Y = 16` → bloque de 512×184 px. Origen `FORM_X = 144` (centrado), `FORM_Y = 80`.
     - Marcha: paso discreto horizontal `STEP_X = 8` px cada `stepMs = 80 + 13 × (vivos − 1)` ms → 782 ms con los 55 vivos, 80 ms con el último. Al tocar `x < 16` o `x + ALIEN_W > 784` cualquier invasor vivo: el **bloque entero** baja `STEP_Y = 16` px e invierte el sentido en el paso siguiente.
     - Animación: cada paso alterna entre los dos fotogramas del sprite de cada fila, dibujados con rectángulos.
     - Superficie `SURFACE_Y = 520`: si el borde inferior de cualquier invasor vivo llega a 520, derrota inmediata (sin descontar vidas).
     - Cañón: 44×20 px, `CANNON_Y = 540`, `CANNON_SPEED = 300` px/s, `x` limitado a `[16, 740]`, arranca centrado en `x = 378`.
     - Disparo del jugador: 4×14 px, `SHOT_SPEED = 520` px/s hacia arriba, **uno solo en pantalla**.
     - Bombas: 6×14 px, `BOMB_SPEED = 180` px/s hacia abajo, **máximo 2 simultáneas**, una cada `BOMB_MS = 900` ms si hay hueco, desde un invasor vivo elegido al azar entre los **más bajos de cada columna**.
     - Búnkeres: 4, cada uno una rejilla de `BUNKER_COLS = 12` × `BUNKER_ROWS = 8` celdas de 6×6 px (72×48 px). `BUNKER_Y = 440`; `x` en `92`, `268`, `444`, `620`. Perfil inicial: esquinas superiores en escalón (2+1 celdas por lado) y arco de base (columnas 4–7, filas 6–7).
     - Vidas: `LIVES = 3`. Al perder una, 1000 ms de pausa de respawn en los que se borran todos los proyectiles y el cañón vuelve al centro; la formación no avanza durante la pausa.
   - **Constantes del twist:**
     - `MARK_MULTIPLIER = 5`, `MARK_ROTATE_MS = 6000`, `CHAIN_BONUS = 100`.
   - **Reglas base:**
     - La partida arranca en movimiento: `start()` pone la formación a marchar.
     - Impacto de un disparo en un invasor: desaparece, el disparo se consume, suma puntos y la marcha se acelera. Explosión de 150 ms.
     - Impacto de un disparo o de una bomba en una celda de búnker: se destruyen esa celda y sus 4 vecinas ortogonales, y el proyectil se consume.
     - Disparo y bomba se **cruzan sin interactuar**.
     - Bomba que alcanza el cañón: −1 vida, explosión de 600 ms, respawn. Con 0 vidas → fin.
   - **Reglas del twist «el delator»:**
     - En todo momento hay **exactamente un invasor vivo marcado**. En `start()` y en `restart()` se elige al azar entre los 55.
     - El marcado se dibuja distinto: relleno magenta, contorno parpadeante a 4 Hz y un pequeño rombo sobre su cabeza. Es la **única** información nueva en el canvas.
     - **Matar al marcado:** suma `valor de su fila × 5` (150, 100 o 50), incrementa la **cadena** en 1 y se marca al instante otro invasor vivo al azar. Si no queda ninguno vivo, no se marca nada.
     - **Matar a un invasor no marcado:** suma el valor normal de su fila (30, 20 o 10) y **la cadena vuelve a 0**.
     - **Rotación automática:** si el marcado sobrevive `MARK_ROTATE_MS = 6000` ms, la marca salta a otro invasor vivo al azar (distinto del actual si hay más de uno). La rotación **no** toca la cadena. Esto garantiza que la marca nunca queda inalcanzable de forma permanente detrás de la formación.
     - Perder una vida **no** reinicia la cadena, pero sí rearma el temporizador de rotación.
     - El motor guarda `maxChain` = mayor cadena alcanzada en la partida. `onChain(chain)` emite sólo en cambios reales del valor **actual**.
     - **Bonus final:** al terminar la partida (en cualquiera de las tres condiciones de fin) se suma `maxChain × 100` a la puntuación, se emite el `onScore` final y después `onGameOver(score)`.
   - **Puntuación:**
     - Fila 1 (la superior) 30 · filas 2 y 3 20 · filas 4 y 5 10.
     - El mismo valor **×5** si el invasor estaba marcado: 150 · 100 · 50.
     - Bonus final `maxChain × 100`.
     - **Puntuación máxima alcanzable: 10 450** = `(11 × 150 + 22 × 100 + 22 × 50) + 55 × 100` = `4950 + 5500`, dentro de `0–9 999 999`. Jugando sin encadenar nunca, el suelo de una partida perfecta sigue siendo 990 + 100 = **1090**.
   - **Fin de partida (inequívoco):** (a) vidas a 0, (b) la formación alcanza `SURFACE_Y`, (c) victoria al eliminar los 55. Los tres aplican el bonus final y llaman a `onGameOver(score)` **una sola vez**; después el canvas queda congelado.
   - **Dibujo en canvas** (sólo lo que el HUD React no puede mostrar): invasores con sus dos fotogramas, **el marcado destacado**, cañón, disparo, bombas, búnkeres celda a celda, explosiones y la línea de superficie en `y = 520`. Sin texto de puntuación, sin cadena escrita en canvas, sin vidas dibujadas, sin overlays.
   - Sin audio.
3. **Componente cliente** `components/invasores-canvas.tsx` (`"use client"`), mismo patrón que `components/tetris-canvas.tsx` (que ya usa `onLines`): callbacks vía ref, props `paused` y `restartKey`, `onChain` opcional, `onAutoPause` con `visibilitychange`, seguro con Strict Mode. Canvas lógico fijo **800×600** escalado por CSS dentro de `.crt-screen` con el aspecto por defecto `4 / 3`.
4. **Ampliación del contrato (`hasChain` / `onChain`)** — calcada del par `hasLines` / `onLines` que introdujo el SPEC 07:
   - `lib/games/types.ts`: `GameCanvasProps` gana `onChain?: (chain: number) => void`.
   - `lib/games/registry.ts`: `GameEntry` gana `hasChain?: boolean // true: el HUD añade CADENA`.
   - `components/game-player.tsx`: si la entrada tiene `hasChain`, el HUD añade el campo `CADENA` junto a PUNTOS/VIDAS/NIVEL, alimentado por `onChain` y reiniciado a 0 en cada partida. Ningún juego existente declara `hasChain`, así que ninguno cambia.
5. **Registro y reproductor** — entrada `invasores` con:
   - HUD: puntuación, **vidas** (`hasLives: true`) y **cadena** (`hasChain: true`). `engineLevel: false` → el HUD muestra el nivel derivado `floor(score / 2500) + 1` (aquí llega como mucho a `05`); aceptado, sin lógica de nivel en el motor.
   - Sin chip de sonido, sin salto de nivel.
   - Mando táctil: `touch: { dpad: ["left", "right"], buttons: [{ id: "a", label: "DISPARAR" }] }`, sobre el canal `VirtualPad` del SPEC 10.
6. **Controles:**
   - `←`/`→` y `A`/`D` mueven el cañón; `ESPACIO` dispara; `P` o `Escape` alternan PAUSA/REANUDAR vía `onTogglePause`.
   - En táctil: cruz izquierda/derecha y botón **A** (DISPARAR), leídos desde `pad` en `input.ts`.
   - `preventDefault` sólo en flechas, `A`, `D` y `Space` (no en `P` ni `Escape`). Se ignoran las teclas con el foco en `input`/`textarea` y las que llevan `Ctrl`/`Meta`/`Alt`. Con la partida pausada o terminada, movimiento y disparo no actúan; `P`/`Escape` alternan la pausa salvo tras el fin.
   - Texto de controles bajo el CRT: `← → / AD mover · ESPACIO disparar · P pausa`.
7. **Leaderboard** — sin cambios de esquema: guardado con `submitScore({ gameId: "invasores", name, score })` y lectura por `game_id` en el Salón (`/salon?juego=invasores`), detalle y cards. Estado vacío con 0 partidas y revalidación ya cubiertos por el SPEC 06; aquí sólo se verifica.
8. **Pulido visual** con `/frontend-design`: paleta de las filas coherente con `.cover-invaders`, **tratamiento visual del marcado** (magenta pulsante sin confundirse con las filas magenta normales), campo `CADENA` del HUD, búnkeres, explosiones, hint de controles y overlay de pausa.
9. `get_advisors` al cierre. `database.types.ts` no se regenera (el esquema no cambia).

**No incluido (fuera de alcance de este spec):**

- Olas sucesivas, niveles, dificultad creciente, salto de nivel (`levelJump`).
- Nave nodriza / platillo de bonus.
- Audio de cualquier tipo (y por tanto chip `SONIDO` y slider de volumen).
- Intercepción de bombas con el disparo del jugador.
- Vidas extra por puntuación, bonus por vidas restantes.
- Más de un invasor marcado a la vez, marcas con temporizador visible o marcas que se muevan por la formación.
- Búnkeres que se reparan o que resisten varios impactos por celda.
- Sprites en imagen: todo se dibuja con rectángulos; no hay nada en `public/games/invasores/`.
- Pantalla completa, guardado de partida en curso.
- Auth, anti-trampas, rate limit, scores ligados a usuario.
- Los demás juegos del catálogo (Glotón, Duelo Pixel, Columnas).
- Pruebas automatizadas (no hay test runner).
- Nueva portada: se reutiliza `.cover-invaders`.

## Modelo de datos

Migración (valores reales; respeta los `CHECK` de `games`). Es un `INSERT`: no hay fila previa ni `scores` que borrar.

```sql
insert into public.games (id, title, short, long, category, color, cover, sort_order)
values (
  'invasores',
  'INVASORES',
  'Defiende el planeta de filas alienígenas.',
  'Una formación de 55 alienígenas marcha de lado a lado y baja un escalón cada vez que toca el borde. Mueve tu cañón, dispara de uno en uno y cúbrete tras cuatro búnkeres que se deshacen. Cada fila vale 30, 20 o 10 puntos, pero siempre hay un invasor marcado en magenta que vale cinco veces su fila y encadena: derribar marcados seguidos sube la cadena, y al acabar la partida cada eslabón de tu mejor cadena suma 100 puntos. Tienes 3 vidas y pierdes si la formación toca la superficie.',
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
  onChain: (chain: number) => void; // cadena actual de marcados seguidos
  onGameOver: (finalScore: number) => void; // ya incluye el bonus maxChain × 100
  onTogglePause: () => void;
};

export type InvasoresGame = {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void; // cancela rAF, quita listeners de teclado y desuscribe el pad
};

export type Alien = { col: number; row: number; alive: boolean; marked: boolean };
export type Shot = { x: number; y: number; vy: number };
export type Bunker = { x: number; y: number; cells: boolean[][] }; // [row][col], 8 × 12
export type Phase = "playing" | "respawn" | "over";
```

Ampliación del contrato (dos líneas nuevas, patrón `hasLines`/`onLines` del SPEC 07):

```ts
// lib/games/types.ts — GameCanvasProps
onChain?: (chain: number) => void;

// lib/games/registry.ts — GameEntry
hasChain?: boolean; // true: el HUD añade CADENA
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
  hasChain: true,
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
lib/games/invasores/constants.ts                     // nuevo: formación, marcha, cañón, proyectiles, búnkeres, puntos por fila, MARK_MULTIPLIER, MARK_ROTATE_MS, CHAIN_BONUS
lib/games/invasores/entities.ts                      // nuevo: formación con marcado, cañón, proyectiles, búnkeres con máscara de celdas, colisiones AABB, dibujo
lib/games/invasores/input.ts                         // nuevo: teclado + VirtualPad, attach/detach
lib/games/invasores/engine.ts                        // nuevo: createInvadersGame, cadena y bonus final
components/invasores-canvas.tsx                      // nuevo
lib/games/types.ts                                   // modificado: onChain en GameCanvasProps
lib/games/registry.ts                                // modificado: hasChain en GameEntry + entrada invasores
components/game-player.tsx                           // modificado: campo CADENA del HUD cuando hasChain
app/globals.css                                      // modificado sólo si el pulido lo requiere (campo CADENA, hint)
references/catalogo-juegos.md                        // modificado: añadir la fila al snapshot
```

## Plan de implementación

1. **Guía y estado base** — leer en `node_modules/next/dist/docs/` Client Components y rutas dinámicas de Next 16; confirmar con `list_tables`/`select` que `games` no tiene fila `invasores` y que `sort_order: 7` sigue libre; releer cómo el SPEC 07 cableó `hasLines`/`onLines` en `game-player.tsx`.
2. **Migración del catálogo** — SQL en `supabase/migrations/` + `apply_migration`. Verificar `/juegos/invasores` con la portada `cover-invaders`, la card en biblioteca y home, y el leaderboard vacío.
3. **Contrato `hasChain`/`onChain`** — añadir las dos líneas a `types.ts` y `registry.ts` y el campo `CADENA` a `game-player.tsx`. Verificar que los cinco juegos existentes no cambian (ninguno declara `hasChain`).
4. **Constantes** — portar a TypeScript estricto todos los números de la sección Alcance, incluidos los del twist.
5. **Entidades** — formación con `col`/`row` y bandera `marked`, cañón, proyectiles, búnkeres con máscara `boolean[8][12]` y perfil recortado, colisiones AABB, destrucción de celda + 4 vecinas, dibujo con `ctx` por parámetro (incluido el tratamiento del marcado).
6. **Input** — `attachInput(canvas, pad)` que devuelve su limpieza; teclado y `VirtualPad`; `preventDefault` sólo en las teclas del juego; ignora `input`/`textarea` y modificadores.
7. **Motor base (jugable)** — estado en closure, marcha, disparo único, bombas, búnkeres, vidas, tres condiciones de fin, puntuación 30/20/10 sin twist. Deja el juego funcional y verificable.
8. **Motor: el delator** — marcado inicial, ×5, cadena, rotación a 6000 ms, `maxChain`, bonus final antes de `onGameOver`. Verificar con una partida que la cadena sube, se rompe al matar a un no marcado y el bonus se aplica.
9. **Componente `InvasoresCanvas`** — montaje en `useEffect`, Strict Mode, `visibilitychange`, escalado 800×600, `pad`, `onChain`.
10. **Pulido y verificación manual** — con `/frontend-design`; partida completa (mover, disparar, cadena, rotura de cadena, rotación de la marca, deshacer un búnker, morir por bomba, perder por superficie, ganar limpiando los 55), guardar iniciales, ver la marca en Salón, detalle y card, jugar de nuevo, salir y volver, escritorio y ancho móvil con el mando táctil. Capturas en `.playwright-screenshot`. Actualizar `references/catalogo-juegos.md`.
11. **Cierre** — `get_advisors`, `npm run lint`, `npm run build`, `git status`; borrar con `execute_sql` las filas de prueba de `scores` con `game_id = 'invasores'`.

## Criterios de aceptación

- [ ] `/juegos/invasores/jugar` muestra el juego dentro del marco CRT con proporción 4/3 y canvas lógico 800×600.
- [ ] Al arrancar hay 55 invasores en 5 filas × 11 columnas, bloque de 512×184 px con esquina superior izquierda en `(144, 80)`, el cañón centrado en `x = 378`, `y = 540`, y 4 búnkeres intactos en `x = 92, 268, 444, 620`, `y = 440`.
- [ ] La formación avanza 8 px por paso; el paso dura 782 ms con los 55 vivos y 80 ms con uno solo; al tocar el borde baja 16 px e invierte el sentido en bloque.
- [ ] Hay **siempre exactamente un** invasor marcado mientras quede alguno vivo, visualmente distinguible de los demás.
- [ ] Matar al marcado suma 150, 100 o 50 según su fila (30/20/10 × 5) y marca otro al instante; matar a uno no marcado suma 30, 20 o 10.
- [ ] El HUD muestra `CADENA`: sube 1 por marcado derribado, vuelve a 0 al derribar un no marcado y **no** se reinicia al perder una vida.
- [ ] Si el marcado sobrevive 6 s, la marca salta a otro invasor vivo y la cadena **no** cambia.
- [ ] Al terminar la partida el marcador suma `mejor cadena × 100` antes de abrir el modal, y el modal muestra ese total.
- [ ] Una partida perfecta derribando siempre al marcado da exactamente **10 450** puntos.
- [ ] `←`/`→` y `A`/`D` mueven el cañón a 300 px/s sin salir de `[16, 740]`; la página no hace scroll con esas teclas ni con `ESPACIO`.
- [ ] Sólo hay un disparo del jugador en pantalla: pulsar `ESPACIO` con un disparo activo no crea otro.
- [ ] Como máximo hay 2 bombas en pantalla, salen de los invasores más bajos de su columna y aparecen a lo sumo cada 900 ms.
- [ ] Un impacto en un búnker borra la celda alcanzada y sus 4 vecinas ortogonales, consume el proyectil y es visible; los búnkeres no se reparan.
- [ ] Disparo y bomba se cruzan sin destruirse.
- [ ] Una bomba en el cañón resta una vida, limpia los proyectiles y reaparece el cañón centrado tras 1 s; con 0 vidas abre el modal "FIN DEL JUEGO".
- [ ] Que el borde inferior de un invasor llegue a `y = 520` abre el modal de inmediato, con las vidas que queden.
- [ ] El modal de fin se abre **una sola vez** por partida en las tres condiciones; el botón FIN también lo abre y aplica el bonus de cadena.
- [ ] El HUD React muestra puntuación, vidas y cadena del motor en tiempo real; el canvas no dibuja ninguno de los tres ni overlays.
- [ ] No hay audio ni chip `SONIDO` en Invasores.
- [ ] PAUSA congela formación, proyectiles y los temporizadores de bomba y de rotación de marca; REANUDAR continúa sin saltos; `P` y `Escape` alternan; cambiar de pestaña pausa. Con el modal abierto `P`/`Escape` no hacen nada.
- [ ] En móvil aparece el mando con cruz izquierda/derecha y botón DISPARAR, y el juego es jugable sólo con él.
- [ ] Guardar iniciales válidas crea una fila en `scores` con `game_id: "invasores"`; iniciales inválidas se rechazan sin cerrar el modal.
- [ ] La marca aparece en `/salon?juego=invasores`, en el sidebar del detalle y en `best`/`plays` de la card.
- [ ] Sin partidas: estado vacío en Salón y detalle.
- [ ] JUGAR DE NUEVO reinicia score 0, cadena 0, 3 vidas, los 55 invasores con un marcado nuevo, los 4 búnkeres y el cañón centrado, sin duplicar loop ni listeners; Strict Mode sin duplicados ni errores en consola.
- [ ] `asteroides`, `tetris`, `arkanoid`, `snake` y `frogger` conservan comportamiento y HUD, y **ninguno** muestra el campo CADENA.
- [ ] `games` contiene la fila `invasores` con `title: INVASORES`, `category: SHOOTER`, `color: green`, `cover: cover-invaders`, `sort_order: 7`, y respeta los `CHECK`.
- [ ] El canvas escala en móvil sin desbordar y mantiene la proporción 4/3.
- [ ] `get_advisors` sin problemas críticos nuevos; `npm run lint` y `npm run build` pasan.

## Decisiones tomadas y descartadas

- **Sí:** `INSERT` de una fila nueva en `games` — la migración `20261005120000_remove_unimplemented_games.sql` borró el placeholder `invasores` y sus `scores` por cascada. **No:** `UPDATE` de un placeholder (no queda ninguno) ni `delete from public.scores` previo (sería un no-op).
- **Sí:** `sort_order: 7`. **No:** el `5` que proponía la ficha 005 (lo ocupó `frogger`) ni el `4` (comprometido con la jam de `gloton`).
- **Sí:** reutilizar `.cover-invaders`, ya existente y huérfana. **No:** crear `.cover-invasores`.
- **Sí:** **una sola** mecánica propia, el delator, elegida porque ataca el punto débil del Space Invaders como juego de leaderboard: con la puntuación clásica, toda partida perfecta empata en 990. **No:** apilar también intercepción de bombas, power-ups o vidas extra (serían varias mecánicas y otro juego).
- **Sí:** multiplicador ×5 sobre el valor de la fila, en vez de un valor fijo por marcado — mantiene vivo el incentivo clásico de disparar arriba. **No:** marcado con valor plano (anularía la jerarquía de filas del original).
- **Sí:** la cadena se rompe al matar a un invasor **no marcado**, de modo que el jugador debe decidir entre despejar la columna que le amenaza o ir a por el marcado. **No:** romperla al perder una vida (castigo doble y frustrante) ni al fallar un disparo (el disparo único ya penaliza fallar).
- **Sí:** rotación automática de la marca cada 6 s. **No:** marca fija hasta que muera (podía quedar en una fila trasera inalcanzable y convertir la mecánica en inerte).
- **Sí:** bonus final `mejor cadena × 100`, aplicado también al perder. **No:** bonus sólo al ganar (la mayoría de partidas acaban en derrota y la mecánica quedaría sin recompensa visible).
- **Sí:** ampliar el contrato con `hasChain`/`onChain`, calcado de `hasLines`/`onLines` del SPEC 07. **No:** reutilizar `onLines` con otro significado (el HUD diría LÍNEAS) ni dibujar la cadena en el canvas (el HUD React sí puede mostrarla).
- **Sí:** mantener intacto el resto del original (marcha, disparo único, bombas, búnkeres, 3 vidas, 3 condiciones de fin). **No:** tocar velocidades ni balance para "compensar" el twist.
- **Sí:** puntuación clásica 30/20/20/10/10 como base. **No:** puntos por búnker, por tiempo o por vidas restantes.
- **Sí:** velocidad de marcha en función de los invasores vivos. **No:** velocidad fija.
- **Sí:** derrota inmediata si la formación toca `y = 520`, sin descontar vidas. **No:** restar una vida y continuar.
- **Sí:** búnkeres como máscara de celdas 12×8 de 6×6 px con destrucción de celda + 4 vecinas. **No:** `ImageData` por píxel ni contador de impactos.
- **Sí:** invasores, cañón y búnkeres dibujados con rectángulos en código. **No:** spritesheet en `public/`.
- **Sí:** `engineLevel: false`. **No:** derivar un "nivel" del score en el motor sólo para llenar el HUD.
- **Sí:** mando táctil `left`/`right` + botón A. **No:** cruz completa de 4 direcciones.
- **Sí:** tope de `dt` de 50 ms y acumulador de pasos. **No:** `setInterval`.
- **Sí:** motor TypeScript con `createInvadersGame(canvas, callbacks)`. **No:** `iframe` ni `next/script`.
- **Sí:** HUD y modal de fin en React. **No:** HUD ni overlays en canvas.
- **Sí:** guardado con `submitScore` existente. **No:** tablas por juego ni `localStorage`.

## Riesgos identificados

| Riesgo                                                                  | Mitigación                                                                                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Strict Mode duplica loop o listeners                                    | `destroy()` completo (rAF, teclado y desuscripción del pad); criterio de aceptación explícito.                     |
| Teclas del juego interfieren con el input del modal                     | Ignorar eventos con target `input`/`textarea` y con modificadores; pausar al abrir el modal.                       |
| `dt` grande al volver a la pestaña                                      | Tope de 50 ms y pausa con `visibilitychange`.                                                                      |
| El marcado cae en una fila trasera y la mecánica se vuelve inerte       | Rotación automática a los 6 s, con criterio de aceptación propio.                                                  |
| El marcado magenta se confunde con las filas magenta normales           | Contorno parpadeante a 4 Hz + rombo sobre la cabeza; se valida visualmente en el paso 10 con `/frontend-design`.   |
| La cadena desequilibra la partida y el score depende sólo del twist     | El twist aporta como mucho el 90 % del techo por diseño y está declarado; el suelo perfecto sin encadenar es 1090. |
| Tocar `game-player.tsx` rompe el HUD de los cinco juegos existentes     | `hasChain` es opcional y ningún juego lo declara; paso 3 y criterio de aceptación lo verifican antes de seguir.    |
| `onChain` emitiendo en cada frame provoca renders de más                | El motor sólo llama al callback cuando el valor cambia, como ya hace `onLines` en Tetris.                          |
| La máscara de celdas de los búnkeres cuesta de afinar visualmente       | Perfil inicial definido por constantes y verificado por captura en el paso 10.                                     |
| Colisión contra 4 × 96 celdas cada frame puede ser costosa              | Filtrar antes por el AABB del búnker completo; sólo entonces recorrer celdas.                                      |
| La formación "baja" dos veces si varios invasores tocan el borde        | El descenso se decide una vez por paso sobre el AABB del bloque, no por invasor.                                   |
| El bonus final se aplica dos veces si el fin se dispara por dos caminos | Una sola función de cierre, protegida por el estado `over`; criterio de aceptación de "una sola vez".              |
| Scores falsos con clave publishable                                     | Aceptado hasta el spec de Auth; `CHECK`s de formato y rango.                                                       |
| Un solo proyecto Supabase para dev y prod                               | Limpiar filas de prueba de `scores` al cerrar (paso 11).                                                           |
| Un `id`/slug distinto del `id` de `games` rompe la ruta                 | La fila, la ruta `/juegos/invasores` y la carpeta `lib/games/invasores` usan el mismo slug.                        |
| `sort_order: 7` deja de estar libre si otra rama inserta antes          | El paso 1 lo reconfirma con un `select` antes de escribir la migración.                                            |

## Qué **no** está en este spec

- Olas, niveles, salto de nivel y dificultad creciente.
- Nave nodriza y vidas extra.
- Audio de cualquier tipo.
- Intercepción de bombas.
- Varios marcados a la vez, temporizador visible de la marca o marcas móviles.
- Búnkeres reparables o con resistencia por celda.
- Sprites en imagen y cualquier archivo en `public/games/invasores/`.
- Pantalla completa y guardado de partida.
- Auth/anti-trampas y scores ligados a usuario.
- Los demás juegos del catálogo.
- Pruebas automatizadas.
