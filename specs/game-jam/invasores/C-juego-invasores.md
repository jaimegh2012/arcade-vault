# INVASORES — variante C: de autor, la invasión completa

- **Estado:** Borrador
- **Depende de:** SPEC 05, SPEC 06, SPEC 08, SPEC 10
- **Fecha:** 2026-10-17
- **Game jam:** tema «elige un juego ya registrado y no implementado de `references/game-suggestions-todo.md`» · variante C de 3 · hermanas `A-juego-invasores.md`, `B-juego-invasores.md`
- **Al aprobar:** poner `Estado: Aprobado`, copiar a `specs/NN-juego-invasores.md` y ejecutar `/spec-impl NN-juego-invasores`

**Objetivo:** Crear un Space Invaders completo de **5 olas** en `/juegos/invasores/jugar`, con nave nodriza, vida extra, audio sintetizado y salto de ola, fila nueva en el catálogo y leaderboard en Supabase.

## Por qué existe este spec

No hay código original que portar: `references/started-games/` sólo contiene `02-asteroids`, `03-tetris` y `04-arkanoid`, los tres ya portados. Las reglas, constantes, puntuación, tabla de olas, tabla de la nodriza y síntesis de audio de esta variante se **definen aquí** (decisiones de la jam, derivadas del Space Invaders de 1978 y de la ficha 005 de `references/game-suggestions-todo.md`), no se extraen de un `game.js`. Por eso las constantes y las tablas de la sección Alcance son la **fuente de verdad** para `/spec-impl`, igual que en `specs/09-juego-snake.md`.

## Alcance

**Incluido:**

1. **Catálogo** — fila **nueva** en `games` (`INSERT`, no `UPDATE`: la migración `20261005120000_remove_unimplemented_games.sql` borró el placeholder `invasores` y sus `scores` por cascada). Migración `supabase/migrations/<timestamp>_game_invasores.sql` aplicada con `apply_migration`:
   - `id: "invasores"`, `title: "INVASORES"`, `category: "SHOOTER"`, `color: "green"`, `cover: "cover-invaders"` (clase existente y hoy huérfana en `app/globals.css:758`; **no se crea portada nueva**), `sort_order: 7`.
   - `short`: `Defiende el planeta de filas alienígenas.` (texto del prototipo, `references/templates/data.jsx:51`).
   - `long` describe **sólo** lo que esta variante tiene: 5 olas cada vez más rápidas y más bajas, nave nodriza de bonus, 4 búnkeres, 3 vidas más una extra a los 5000 y puntuación 10/20/30 con bonus de ola. **No menciona** invasores marcados ni cadenas (eso es la variante B).
   - `lib/home-data.ts` ya dice `game: "Invasores"` (línea 50): no se toca.
2. **Motor** en `lib/games/invasores/`: `constants.ts`, `levels.ts`, `entities.ts`, `input.ts`, `audio.ts`, `engine.ts`.
   - Sin globals de módulo con estado ni `document.getElementById`; las funciones de dibujo reciben `ctx`. El motor no toca `localStorage` ni el DOM fuera del `canvas` recibido.
   - API: `createInvadersGame(canvas, callbacks)` → `{ start, pause, resume, restart, jumpToLevel, setMuted, setVolume, destroy }` (mismo juego de métodos que `arkanoid`, SPEC 08).
   - Callbacks: `onScore(score)`, `onLives(lives)`, `onLevel(wave)`, `onGameOver(finalScore)`, `onTogglePause()`.
   - Loop `requestAnimationFrame` con `dt` ≤ 50 ms; acumulador de tiempo para la marcha (paso discreto). `destroy()` cancela rAF, quita los listeners de teclado, desuscribe el mando virtual y cierra el `AudioContext`.
   - **Constantes base** (canvas lógico **800×600**):
     - Formación: `COLS = 11`, `ROWS = 5`, `ALIEN_W = 32`, `ALIEN_H = 24`, `GAP_X = 16`, `GAP_Y = 16` → bloque de 512×184 px. Origen `FORM_X = 144`; `FORM_Y` según la ola (tabla).
     - Marcha: paso discreto horizontal `STEP_X = 8` px cada `stepMs = (80 + 13 × (vivos − 1)) / velocidadDeLaOla`. Al tocar `x < 16` o `x + ALIEN_W > 784`: el bloque baja `STEP_Y = 16` px e invierte el sentido en el paso siguiente.
     - Superficie `SURFACE_Y = 520`: si el borde inferior de cualquier invasor vivo llega a 520, derrota inmediata (sin descontar vidas), en cualquier ola.
     - Cañón: 44×20 px, `CANNON_Y = 540`, `CANNON_SPEED = 300` px/s, `x` limitado a `[16, 740]`, arranca centrado en `x = 378`.
     - Disparo del jugador: 4×14 px, `SHOT_SPEED = 520` px/s hacia arriba, **uno solo en pantalla**.
     - Bombas: 6×14 px, `BOMB_SPEED = 180` px/s hacia abajo, máximo simultáneo según la ola, una cada `BOMB_MS = 900` ms si hay hueco, desde un invasor vivo elegido al azar entre los **más bajos de cada columna**.
     - Búnkeres: 4, cada uno rejilla de `BUNKER_COLS = 12` × `BUNKER_ROWS = 8` celdas de 6×6 px (72×48 px). `BUNKER_Y = 440`; `x` en `92`, `268`, `444`, `620`. Perfil inicial: esquinas superiores en escalón (2+1 celdas por lado) y arco de base (columnas 4–7, filas 6–7).
     - Vidas: `LIVES = 3`, más **una vida extra** la primera vez que la puntuación llega a `EXTRA_LIFE_AT = 5000` (una sola vez por partida). Al perder una, 1000 ms de pausa de respawn que limpia los proyectiles y recentra el cañón.
     - Transición de ola: 1500 ms de pausa con el rótulo `OLA n` dibujado en el canvas (es el único texto del canvas: el HUD React no puede mostrar una transición temporizada sobre el campo).
   - **Tabla de olas** en `levels.ts` (5 olas):

     | Ola | `FORM_Y` inicial | Velocidad | Bombas simultáneas | Búnkeres     | Bonus al limpiar |
     | --- | ---------------- | --------- | ------------------ | ------------ | ---------------- |
     | 1   | 80               | 1.00      | 2                  | 4 nuevos     | 500              |
     | 2   | 96               | 1.15      | 2                  | se conservan | 1000             |
     | 3   | 112              | 1.32      | 3                  | 4 nuevos     | 1500             |
     | 4   | 128              | 1.52      | 3                  | se conservan | 2000             |
     | 5   | 144              | 1.75      | 4                  | 4 nuevos     | 2500             |

   - **Nave nodriza:** 48×20 px, cruza por `UFO_Y = 48` a `UFO_SPEED = 90` px/s, alternando el lado de entrada. Aparece `UFO_FIRST_MS = 20 000` ms después de empezar la ola y luego cada `UFO_EVERY_MS = 25 000` ms, con un máximo de `UFO_MAX_PER_WAVE = 3` apariciones por ola. Sólo puede haber una en pantalla. Su valor sale de la tabla clásica por número de disparos efectuados en la vida actual: `UFO_TABLE = [50, 100, 50, 100, 150, 100, 100, 50, 300, 100, 100, 100, 50, 150, 100, 50, 100, 150, 100, 50, 100, 50, 100, 150, 100]`, índice `disparos % 25` → máximo **300**. Al ser alcanzada explota 400 ms y muestra su valor en el lugar del impacto durante ese tiempo.
   - **Reglas:**
     - `start()` arranca la ola 1 tras su transición.
     - Impacto de un disparo en un invasor: desaparece, el disparo se consume, suma los puntos de su fila y la marcha se acelera. Explosión de 150 ms.
     - Impacto de disparo o bomba en una celda de búnker: se destruyen esa celda y sus 4 vecinas ortogonales, y el proyectil se consume. Los búnkeres se **renuevan sólo** en las olas 1, 3 y 5 (tabla).
     - Disparo y bomba se cruzan sin interactuar.
     - Bomba en el cañón: −1 vida, explosión de 600 ms, respawn. Con 0 vidas → fin.
     - Limpiar los 55 invasores de una ola: suma el bonus de la tabla y carga la ola siguiente conservando puntuación, vidas y búnkeres cuando corresponda. Limpiar la ola 5 es **victoria**.
     - **Puntuación:** fila 1 (la superior) **30** · filas 2 y 3 **20** · filas 4 y 5 **10** · nodriza **50/100/150/300** · bonus de ola **500 × ola**.
     - **Puntuación máxima alcanzable: 16 950** = `5 × 990` (invasores) `+ 5 × 3 × 300` (nodrizas) `+ 500 + 1000 + 1500 + 2000 + 2500` (bonus) = `4950 + 4500 + 7500`, dentro de `0–9 999 999`.
     - **Fin de partida (inequívoco):** (a) vidas a 0, (b) la formación alcanza `SURFACE_Y` en cualquier ola, (c) victoria al limpiar la ola 5. Los tres llaman a `onGameOver(score)` **una sola vez**; después el canvas queda congelado.
   - **Audio sintetizado** en `audio.ts` con Web Audio API, **sin ningún archivo binario**:
     - Marcha de 4 tonos: onda cuadrada en 110 / 98 / 87 / 78 Hz, 90 ms, un tono por paso de la formación rotando en ciclo; al acelerarse la marcha se acelera sola.
     - Disparo: barrido cuadrado 880 → 220 Hz en 80 ms.
     - Explosión de invasor: ruido blanco con caída exponencial de 150 ms.
     - Explosión del cañón: ruido blanco con caída de 600 ms y filtro paso bajo descendente.
     - Sirena de la nodriza: onda triangular 600 ↔ 900 Hz modulada a 8 Hz mientras está en pantalla.
     - `AudioContext` creado perezosamente en la primera interacción del jugador (política de autoplay), con `try/catch`; si falla, el juego sigue mudo y sin errores. No suena en pausa ni tras el fin. `setMuted(true)` silencia sin pausar; `setVolume(0–1)` ajusta el volumen (por defecto 0,15; con 0 no suena).
   - **Dibujo en canvas** (sólo lo que el HUD React no puede mostrar): invasores con sus dos fotogramas, cañón, disparo, bombas, nodriza, búnkeres celda a celda, explosiones, el valor de la nodriza al explotar, la línea de superficie en `y = 520` y el rótulo `OLA n` de la transición. Sin puntuación, sin vidas, sin overlay de pausa ni de game over.
3. **Componente cliente** `components/invasores-canvas.tsx` (`"use client"`), mismo patrón que `components/arkanoid-canvas.tsx` (que ya usa `muted`, `volume` y `jumpTo`): callbacks vía ref, props `paused` y `restartKey`, `onAutoPause` con `visibilitychange`, seguro con Strict Mode. Canvas lógico fijo **800×600** escalado por CSS dentro de `.crt-screen` con el aspecto por defecto `4 / 3`.
4. **Registro y reproductor** — `lib/games/registry.ts` añade la entrada `invasores` **sin cambios en el contrato**: `hasSound`, `muted`, `volume`, `levelJump` y `jumpTo` ya existen desde el SPEC 08.
   - HUD: puntuación, **vidas** (`hasLives: true`) y **ola como nivel** (`engineLevel: true`).
   - Chip `SONIDO ON/OFF` y slider de volumen (`hasSound: true`), con las preferencias `av_muted` y `av_volume` ya implementadas.
   - Salto de ola (`levelJump: 5`): chips `1`–`5` en el overlay de pausa; elegir uno carga esa ola (formación nueva con su velocidad y su `FORM_Y`, búnkeres según la tabla) **conservando puntuación y vidas**, como hace `arkanoid`.
   - Mando táctil: `touch: { dpad: ["left", "right"], buttons: [{ id: "a", label: "DISPARAR" }] }`, sobre el canal `VirtualPad` del SPEC 10.
5. **Controles:**
   - `←`/`→` y `A`/`D` mueven el cañón; `ESPACIO` dispara; `P` o `Escape` alternan PAUSA/REANUDAR vía `onTogglePause`.
   - En táctil: cruz izquierda/derecha y botón **A** (DISPARAR), leídos desde `pad` en `input.ts`.
   - `preventDefault` sólo en flechas, `A`, `D` y `Space` (no en `P` ni `Escape`). Se ignoran las teclas con el foco en `input`/`textarea` y las que llevan `Ctrl`/`Meta`/`Alt`. Con la partida pausada, en transición de ola o terminada, movimiento y disparo no actúan; `P`/`Escape` alternan la pausa salvo tras el fin.
   - Texto de controles bajo el CRT: `← → / AD mover · ESPACIO disparar · P pausa`.
6. **Leaderboard** — sin cambios de esquema: guardado con `submitScore({ gameId: "invasores", name, score })` y lectura por `game_id` en el Salón (`/salon?juego=invasores`), detalle y cards. Estado vacío con 0 partidas y revalidación ya cubiertos por el SPEC 06; aquí sólo se verifica.
7. **Pulido visual** con `/frontend-design`: paleta por ola, glow de la nodriza, rótulo `OLA n`, chips de sonido y de salto de ola, hint de controles y overlay de pausa.
8. `get_advisors` al cierre. `database.types.ts` no se regenera (el esquema no cambia).

**No incluido (fuera de alcance de este spec):**

- Más de 5 olas, bucle infinito de olas o dificultad que siga creciendo después de la 5.
- Invasores marcados, cadenas o multiplicadores (son la variante B).
- Intercepción de bombas con el disparo del jugador.
- Archivos de audio en `public/`: todo el sonido es sintetizado.
- Música de fondo; mute o volumen global del sitio.
- Sprites en imagen: todo se dibuja con rectángulos; no hay nada en `public/games/invasores/`.
- Búnkeres que se reparan dentro de una misma ola o que resisten varios impactos por celda.
- Tabla de puntuaciones por ola, estadísticas de precisión o bonus por vidas restantes.
- Impedir farmear puntos con el salto de ola (mismo acuerdo que `arkanoid`, SPEC 08).
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
  'Cinco olas de 55 alienígenas marchan de lado a lado y bajan un escalón al tocar el borde: cada ola empieza más abajo y más rápida que la anterior. Mueve tu cañón, dispara de uno en uno y cúbrete tras cuatro búnkeres que se deshacen y sólo se renuevan en las olas 1, 3 y 5. Las filas valen 30, 20 y 10 puntos, la nave nodriza que cruza arriba hasta 300, y limpiar una ola suma 500 puntos por su número. Tienes 3 vidas, una extra a los 5000 puntos, y pierdes si la formación toca la superficie.',
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
  onLevel: (wave: number) => void; // 1–5
  onGameOver: (finalScore: number) => void; // vidas a 0, superficie alcanzada o victoria en la ola 5
  onTogglePause: () => void;
};

export type InvasoresGame = {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  jumpToLevel(wave: number): void; // 1–5, conserva puntuación y vidas
  setMuted(muted: boolean): void;
  setVolume(volume: number): void; // 0–1
  destroy(): void; // cancela rAF, quita listeners, desuscribe el pad y cierra el AudioContext
};

export type WaveConfig = {
  formY: number;
  speed: number;
  maxBombs: number;
  freshBunkers: boolean;
  clearBonus: number;
};

export type Alien = { col: number; row: number; alive: boolean };
export type Shot = { x: number; y: number; vy: number };
export type Ufo = { x: number; dir: 1 | -1; value: number };
export type Bunker = { x: number; y: number; cells: boolean[][] }; // [row][col], 8 × 12
export type Phase = "intro" | "playing" | "respawn" | "over";
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
  engineLevel: true,
  hasLives: true,
  hasSound: true,
  levelJump: 5,
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
lib/games/invasores/constants.ts                     // nuevo: formación, marcha, cañón, proyectiles, búnkeres, puntos por fila, UFO_*, EXTRA_LIFE_AT
lib/games/invasores/levels.ts                        // nuevo: WAVES, tabla de 5 olas + UFO_TABLE
lib/games/invasores/entities.ts                      // nuevo: formación, cañón, proyectiles, nodriza, búnkeres con máscara de celdas, colisiones AABB, dibujo
lib/games/invasores/input.ts                         // nuevo: teclado + VirtualPad, attach/detach
lib/games/invasores/audio.ts                         // nuevo: AudioContext perezoso, marcha de 4 tonos y 4 efectos sintetizados, setMuted/setVolume
lib/games/invasores/engine.ts                        // nuevo: createInvadersGame, olas, nodriza, vida extra, jumpToLevel
components/invasores-canvas.tsx                      // nuevo
lib/games/registry.ts                                // modificado: entrada invasores
app/globals.css                                      // modificado sólo si el pulido lo requiere (rótulo de ola, hint)
references/catalogo-juegos.md                        // modificado: añadir la fila al snapshot
```

## Plan de implementación

1. **Guía y estado base** — leer en `node_modules/next/dist/docs/` Client Components y rutas dinámicas de Next 16; confirmar con `list_tables`/`select` que `games` no tiene fila `invasores` y que `sort_order: 7` sigue libre; releer cómo `arkanoid` cableó `hasSound`, `muted`, `volume` y `levelJump`/`jumpTo` (SPEC 08).
2. **Migración del catálogo** — SQL en `supabase/migrations/` + `apply_migration`. Verificar `/juegos/invasores` con la portada `cover-invaders`, la card en biblioteca y home, y el leaderboard vacío.
3. **Constantes y tabla de olas** — portar a TypeScript estricto todos los números de la sección Alcance, la tabla `WAVES` y `UFO_TABLE`.
4. **Entidades** — formación con `col`/`row`, cañón, proyectiles, búnkeres con máscara `boolean[8][12]` y perfil recortado, colisiones AABB, destrucción de celda + 4 vecinas, dibujo con `ctx` por parámetro.
5. **Input** — `attachInput(canvas, pad)` que devuelve su limpieza; teclado y `VirtualPad`; `preventDefault` sólo en las teclas del juego; ignora `input`/`textarea` y modificadores.
6. **Motor: una ola jugable** — estado en closure, marcha, disparo único, bombas, búnkeres, vidas, condiciones de fin, puntuación 30/20/10. Deja el juego funcional con la ola 1 en bucle de fin.
7. **Motor: progresión de olas** — tabla aplicada (altura, velocidad, bombas, búnkeres), transición de 1500 ms con rótulo, bonus al limpiar, victoria en la ola 5, `onLevel`.
8. **Motor: nodriza y vida extra** — aparición temporizada con tope de 3 por ola, tabla de valor por disparos, explosión con el valor visible, vida extra a los 5000 una sola vez.
9. **Audio** — `audio.ts` con `AudioContext` perezoso, marcha de 4 tonos sincronizada con el paso, 4 efectos, `setMuted`/`setVolume`, cierre en `destroy()`. Verificar que no suena en pausa ni tras el fin y que sin audio disponible el juego sigue.
10. **Componente `InvasoresCanvas`** — montaje en `useEffect`, Strict Mode, `visibilitychange`, escalado 800×600, `pad`, `muted`, `volume`, `jumpTo`.
11. **Registro y reproductor (jugable)** — añadir la entrada `invasores` con `hasSound` y `levelJump: 5`. Verificar chip de sonido, slider y chips de salto de ola, y que `asteroides`, `tetris`, `arkanoid`, `snake` y `frogger` siguen igual.
12. **Pulido y verificación manual** — con `/frontend-design`; partida completa (las 5 olas con salto de ola, nodriza, vida extra, deshacer búnkeres, morir por bomba, perder por superficie, ganar la ola 5), guardar iniciales, ver la marca en Salón, detalle y card, jugar de nuevo, salir y volver, escritorio y ancho móvil con el mando táctil. Capturas en `.playwright-screenshot`. Actualizar `references/catalogo-juegos.md`.
13. **Cierre** — `get_advisors`, `npm run lint`, `npm run build`, `git status`; borrar con `execute_sql` las filas de prueba de `scores` con `game_id = 'invasores'`.

## Criterios de aceptación

- [ ] `/juegos/invasores/jugar` muestra el juego dentro del marco CRT con proporción 4/3 y canvas lógico 800×600.
- [ ] La ola 1 arranca tras un rótulo `OLA 1` de 1,5 s, con 55 invasores en 5×11, bloque con esquina superior izquierda en `(144, 80)`, cañón en `x = 378`, `y = 540`, y 4 búnkeres intactos en `x = 92, 268, 444, 620`, `y = 440`.
- [ ] Cada ola empieza 16 px más abajo que la anterior (80, 96, 112, 128, 144) y con la velocidad de la tabla (1.00, 1.15, 1.32, 1.52, 1.75).
- [ ] El máximo de bombas simultáneas es 2 en las olas 1–2, 3 en las 3–4 y 4 en la 5.
- [ ] Los búnkeres se renuevan al entrar en las olas 1, 3 y 5, y se conservan tal cual al entrar en la 2 y la 4.
- [ ] Un invasor de la fila superior suma 30 puntos, uno de las filas 2 o 3 suma 20 y uno de las 4 o 5 suma 10.
- [ ] Limpiar una ola suma `500 × número de ola` y pasa a la siguiente conservando puntuación y vidas; limpiar la ola 5 abre el modal "FIN DEL JUEGO".
- [ ] La nodriza aparece a los 20 s de la ola y luego cada 25 s, como mucho 3 veces por ola, cruza a 90 px/s por `y = 48` y nunca hay dos a la vez.
- [ ] Derribar la nodriza suma 50, 100, 150 o 300 según `UFO_TABLE[disparos % 25]`, y ese valor se ve 400 ms en el lugar del impacto.
- [ ] Al llegar por primera vez a 5000 puntos el HUD suma una vida; nunca se concede una segunda vida extra.
- [ ] Una partida perfecta (5 olas limpias con 3 nodrizas de 300 en cada una) da exactamente **16 950** puntos.
- [ ] `←`/`→` y `A`/`D` mueven el cañón a 300 px/s sin salir de `[16, 740]`; la página no hace scroll con esas teclas ni con `ESPACIO`.
- [ ] Sólo hay un disparo del jugador en pantalla: pulsar `ESPACIO` con un disparo activo no crea otro.
- [ ] Un impacto en un búnker borra la celda alcanzada y sus 4 vecinas ortogonales y consume el proyectil; disparo y bomba se cruzan sin destruirse.
- [ ] Una bomba en el cañón resta una vida, limpia los proyectiles y reaparece el cañón centrado tras 1 s; con 0 vidas abre el modal "FIN DEL JUEGO".
- [ ] Que el borde inferior de un invasor llegue a `y = 520` abre el modal de inmediato en cualquier ola.
- [ ] El modal de fin se abre **una sola vez** por partida en las tres condiciones; el botón FIN también lo abre.
- [ ] El HUD React muestra puntuación, vidas y ola (1–5) del motor en tiempo real; el canvas sólo dibuja el rótulo `OLA n` y el valor de la nodriza, nada más de texto.
- [ ] El chip `SONIDO` y el slider de volumen aparecen en el reproductor: la marcha de 4 tonos suena un tono por paso y se acelera con la formación; disparo, explosiones y sirena de la nodriza suenan; con `SONIDO OFF` o volumen 0 no suena nada y el juego no se pausa.
- [ ] No suena nada en pausa ni después del fin; si el navegador bloquea el `AudioContext`, la partida sigue muda y sin errores en consola.
- [ ] Los chips `1`–`5` del overlay de pausa cargan esa ola conservando puntuación y vidas, y resaltan la ola actual.
- [ ] PAUSA congela formación, proyectiles, nodriza y temporizadores; REANUDAR continúa sin saltos; `P` y `Escape` alternan; cambiar de pestaña pausa. Con el modal abierto `P`/`Escape` no hacen nada.
- [ ] En móvil aparece el mando con cruz izquierda/derecha y botón DISPARAR, y el juego es jugable sólo con él.
- [ ] Guardar iniciales válidas crea una fila en `scores` con `game_id: "invasores"`; iniciales inválidas se rechazan sin cerrar el modal.
- [ ] La marca aparece en `/salon?juego=invasores`, en el sidebar del detalle y en `best`/`plays` de la card.
- [ ] Sin partidas: estado vacío en Salón y detalle.
- [ ] JUGAR DE NUEVO reinicia score 0, 3 vidas, ola 1, los 4 búnkeres y el cañón centrado, sin duplicar loop, listeners ni `AudioContext`; Strict Mode sin duplicados ni errores en consola.
- [ ] `asteroides`, `tetris`, `arkanoid`, `snake` y `frogger` conservan comportamiento, HUD, sonido y salto de nivel.
- [ ] `games` contiene la fila `invasores` con `title: INVASORES`, `category: SHOOTER`, `color: green`, `cover: cover-invaders`, `sort_order: 7`, y respeta los `CHECK`.
- [ ] El canvas escala en móvil sin desbordar y mantiene la proporción 4/3.
- [ ] `get_advisors` sin problemas críticos nuevos; `npm run lint` y `npm run build` pasan.

## Decisiones tomadas y descartadas

- **Sí:** `INSERT` de una fila nueva en `games` — la migración `20261005120000_remove_unimplemented_games.sql` borró el placeholder `invasores` y sus `scores` por cascada. **No:** `UPDATE` de un placeholder (no queda ninguno) ni `delete from public.scores` previo (sería un no-op).
- **Sí:** `sort_order: 7`. **No:** el `5` que proponía la ficha 005 (lo ocupó `frogger`) ni el `4` (comprometido con la jam de `gloton`).
- **Sí:** reutilizar `.cover-invaders`, ya existente y huérfana. **No:** crear `.cover-invasores`.
- **Sí:** **5 olas** con tabla explícita, copiando la estructura de `LEVELS` de `arkanoid`. **No:** bucle infinito de olas (haría la puntuación máxima indefinida y el spec no podría declarar un techo).
- **Sí:** progresión por altura inicial + velocidad + número de bombas. **No:** añadir filas o columnas a la formación (rompería el bloque de 512 px y el techo de puntuación).
- **Sí:** nodriza con la tabla clásica por número de disparos y tope de 3 por ola. **No:** valor aleatorio (haría el techo indefinido) ni nodriza ilimitada (mismo problema).
- **Sí:** vida extra única a los 5000 puntos. **No:** vidas extra repetidas cada N puntos (alargaría las partidas sin límite y desdibujaría el fin).
- **Sí:** búnkeres renovados sólo en las olas 1, 3 y 5. **No:** renovarlos en todas (quita la tensión de administrar la cobertura) ni nunca (la ola 5 sería injugable).
- **Sí:** audio **sintetizado** con Web Audio API. **No:** archivos `.mp3` en `public/games/invasores/` (la ficha 005 declaró el juego sin assets y los cuatro tonos de la marcha se generan en diez líneas).
- **Sí:** `AudioContext` perezoso en la primera interacción, con `try/catch` y degradación a mudo. **No:** crearlo al montar el componente (lo bloquea la política de autoplay).
- **Sí:** `hasSound` + `levelJump: 5` reutilizando el cableado del SPEC 08, sin tocar el contrato. **No:** inventar props nuevas para el sonido o el salto de ola.
- **Sí:** aceptar que el salto de ola permite farmear bonus de ola. **No:** bloquearlo (mismo acuerdo explícito que `arkanoid`; pertenece al futuro spec de anti-trampas).
- **Sí:** rótulo `OLA n` y valor de la nodriza dibujados en canvas. **No:** más texto en canvas: puntuación, vidas y ola los muestra el HUD React.
- **Sí:** puntuación clásica 30/20/20/10/10 por fila. **No:** multiplicadores, cadenas o invasores marcados (son la variante B).
- **Sí:** derrota inmediata si la formación toca `y = 520`, sin descontar vidas. **No:** restar una vida y continuar.
- **Sí:** búnkeres como máscara de celdas 12×8 de 6×6 px con destrucción de celda + 4 vecinas. **No:** `ImageData` por píxel ni contador de impactos.
- **Sí:** invasores, cañón, nodriza y búnkeres dibujados con rectángulos en código. **No:** spritesheet en `public/`.
- **Sí:** mando táctil `left`/`right` + botón A. **No:** cruz completa de 4 direcciones.
- **Sí:** tope de `dt` de 50 ms y acumulador de pasos. **No:** `setInterval`.
- **Sí:** motor TypeScript con `createInvadersGame(canvas, callbacks)`. **No:** `iframe` ni `next/script`.
- **Sí:** HUD y modal de fin en React. **No:** HUD ni overlay de pausa en canvas.
- **Sí:** guardado con `submitScore` existente. **No:** tablas por juego ni `localStorage`.

## Riesgos identificados

| Riesgo                                                                 | Mitigación                                                                                                               |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Strict Mode duplica loop, listeners o `AudioContext`                   | `destroy()` completo (rAF, teclado, pad y cierre del contexto de audio); criterio de aceptación explícito.               |
| Teclas del juego interfieren con el input del modal                    | Ignorar eventos con target `input`/`textarea` y con modificadores; pausar al abrir el modal.                             |
| `dt` grande al volver a la pestaña                                     | Tope de 50 ms y pausa con `visibilitychange`.                                                                            |
| El audio sintetizado suena mal o chirría                               | Frecuencias y envolventes fijadas por constantes; se valida a oído en el paso 9 y se ajustan sólo esas constantes.       |
| La política de autoplay bloquea el `AudioContext`                      | Creación perezosa tras la primera interacción, `try/catch` y degradación a mudo; criterio de aceptación propio.          |
| Osciladores que no se liberan acumulan nodos y degradan el rendimiento | Cada efecto crea su nodo, lo programa con `stop()` y lo desconecta en `onended`; la sirena es un único nodo reutilizado. |
| El salto de ola permite farmear bonus de ola                           | Aceptado y declarado, igual que en `arkanoid` (SPEC 08).                                                                 |
| Las 5 olas quedan desequilibradas (la 5 injugable o la 1 trivial)      | Tabla de olas en `levels.ts` con un solo sitio que tocar; balance verificado a mano en el paso 12.                       |
| La máscara de celdas de los búnkeres cuesta de afinar visualmente      | Perfil inicial definido por constantes y verificado por captura en el paso 12.                                           |
| Colisión contra 4 × 96 celdas cada frame puede ser costosa             | Filtrar antes por el AABB del búnker completo; sólo entonces recorrer celdas.                                            |
| La formación "baja" dos veces si varios invasores tocan el borde       | El descenso se decide una vez por paso sobre el AABB del bloque, no por invasor.                                         |
| Es el motor más caro del catálogo y el plan puede quedarse a medias    | Riesgo asumido y declarado: el plan parte el motor en tres pasos jugables (6, 7, 8) y el audio en uno aparte (9).        |
| Scores falsos con clave publishable                                    | Aceptado hasta el spec de Auth; `CHECK`s de formato y rango.                                                             |
| Un solo proyecto Supabase para dev y prod                              | Limpiar filas de prueba de `scores` al cerrar (paso 13).                                                                 |
| Un `id`/slug distinto del `id` de `games` rompe la ruta                | La fila, la ruta `/juegos/invasores` y la carpeta `lib/games/invasores` usan el mismo slug.                              |
| Ampliar el registro rompe los cinco juegos existentes                  | No se toca el contrato; el paso 11 y un criterio de aceptación los verifican.                                            |
| `sort_order: 7` deja de estar libre si otra rama inserta antes         | El paso 1 lo reconfirma con un `select` antes de escribir la migración.                                                  |

## Qué **no** está en este spec

- Más de 5 olas o bucle infinito.
- Invasores marcados, cadenas y multiplicadores.
- Intercepción de bombas.
- Archivos de audio en `public/` y música de fondo.
- Sprites en imagen y cualquier archivo en `public/games/invasores/`.
- Búnkeres reparables dentro de una ola o con resistencia por celda.
- Estadísticas de precisión y bonus por vidas restantes.
- Anti-farmeo del salto de ola.
- Pantalla completa y guardado de partida.
- Auth/anti-trampas y scores ligados a usuario.
- Los demás juegos del catálogo.
- Pruebas automatizadas.
