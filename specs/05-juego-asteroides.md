# 05 — Juego Asteroides jugable en el reproductor

- **Estado:** Implemented
- **Depende de:** SPEC 01
- **Fecha:** 2026-10-03

**Objetivo:** Portar el juego de `references/started-games/02-asteroids` a un módulo TypeScript montado en un componente cliente, y hacerlo jugable en `/juegos/asteroides/jugar` dentro del reproductor existente, renombrando el juego "ROCAS" del catálogo a "ASTEROIDES".

## Alcance

**Incluido:**

- Renombrar en el catálogo el juego `rocas` → `asteroides`: `id: "asteroides"`, `title: "ASTEROIDES"` en `lib/data.ts`, clase de portada `.cover-rocas` → `.cover-asteroides` en `app/globals.css` (y su uso en `lib/data.ts`), y el texto `"Rocas"` → `"Asteroides"` en `lib/home-data.ts`. Se ajusta la descripción `long` para que no mencione OVNIs (el juego no los tiene) y sí los power-ups de disparo triple.
- Motor del juego portado de `game.js` a TypeScript en `lib/games/asteroids/` (sin globals de módulo, sin acceso a `document.getElementById`). Conserva toda la mecánica: nave con rotación/empuje/inercia, disparo (`Space`), 3 vidas con invencibilidad parpadeante al reaparecer, asteroides de 3 tamaños que se parten, partículas, wrap toroidal, power-up de disparo triple (soltado al destruir asteroides, TTL, duración), niveles progresivos (`spawnAsteroids(3 + level)`), constantes y puntos (20 / 50 / 100) idénticos al original.
- API del motor: `createAsteroidsGame(canvas, callbacks)` devuelve `{ start, pause, resume, restart, destroy }`. Callbacks: `onScore(score)`, `onLives(lives)`, `onLevel(level)`, `onGameOver(finalScore)`.
- Componente cliente `components/asteroids-canvas.tsx` (`"use client"`) que crea el motor en `useEffect`, registra listeners de teclado y los limpia con `destroy()` al desmontar (compatible con el doble montaje de React Strict Mode). Canvas lógico fijo 800×600 escalado por CSS dentro de `.crt-screen` (responsive, `aspect-ratio: 4/3`, sin romper la proporción).
- `app/juegos/[id]/jugar/page.tsx`: cuando `game.id === "asteroides"` renderiza `AsteroidsCanvas` en lugar de la arena placeholder; el HUD React existente (Jugador, Puntuación, Vidas, Nivel) pasa a leer de los callbacks del motor. Los demás juegos mantienen el placeholder simulado actual sin cambios.
- Se elimina el HUD dibujado en canvas y el overlay "GAME OVER" del original: el HUD lo dibuja React y el fin de partida lo muestra el modal existente. El indicador de disparo triple (`3x 4.2s`) se mantiene dibujado en el canvas (no tiene equivalente en el HUD React).
- Botones del reproductor conectados al motor: PAUSA/REANUDAR (`pause`/`resume`, congela la simulación y el temporizador de power-ups), FIN (termina la partida y abre el modal), SALIR, y JUGAR DE NUEVO (`restart`).
- Fin de partida: `onGameOver` abre el modal "FIN DEL JUEGO" actual con la puntuación final; guarda con `saveScore({ game, score, name })` de `lib/session.ts` (localStorage `av_scores`), igual que hoy.
- Entrada: `ArrowLeft`/`ArrowRight` rotan, `ArrowUp` propulsa, `Space` dispara. `preventDefault` sobre esas teclas mientras el juego está montado para evitar scroll de la página. Se ignoran las teclas con el foco en un `input` (modal de iniciales).
- Se pausa automáticamente al perder foco la pestaña (`visibilitychange`) y el `dt` se mantiene limitado a 50 ms como en el original.
- Estilo: el canvas conserva el look vectorial blanco del original sobre fondo negro, integrado en el marco CRT. Se usa `/frontend-design` para cualquier ajuste visual (textos, overlay de pausa, indicación de controles bajo el CRT).
- Texto de controles visible en la pantalla del reproductor (`←→ ROTAR · ↑ PROPULSAR · ESPACIO DISPARAR`) para el juego asteroides.

**No incluido (fuera de alcance de este spec):**

- Guardar puntuaciones en Supabase, tablas `scores`/`games`, Auth o leaderboard real (el Salón y el detalle siguen con `seededScores` y `av_scores`).
- Controles táctiles / móviles (el juego es solo teclado; en móvil se carga pero no es jugable).
- Sonido, música o efectos de audio.
- Los demás juegos (`03-tetris`, `04-arkanoid`) y el resto de placeholders del catálogo.
- Cambiar mecánicas, balance o reglas del original (OVNIs, hiperespacio, puntuación nueva).
- Pantalla completa, guardado de partida en curso y ajustes (volumen, dificultad).
- Pruebas automatizadas (no hay test runner).

## Modelo de datos

Sin persistencia nueva. El catálogo cambia solo de valores; `av_scores` ya existe en `lib/session.ts`.

Archivos nuevos:

```
lib/games/asteroids/engine.ts      // createAsteroidsGame + loop, estado y update/draw
lib/games/asteroids/entities.ts    // Bullet, Asteroid, Ship, Particle, PowerUp
lib/games/asteroids/constants.ts   // W, H, RADII, SPEEDS, POINTS, POWERUP_*, TRIPLE_SPREAD
lib/games/asteroids/input.ts       // keys / justPressed + attach/detach de listeners
components/asteroids-canvas.tsx    // wrapper cliente con ref al motor
```

Tipos públicos del motor:

```ts
export type AsteroidsCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

export type AsteroidsGame = {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void; // cancela rAF y quita listeners
};
```

El nivel mostrado en el HUD pasa a ser el del motor (`level`), no el derivado `score / 2500` del placeholder. Ese cálculo se conserva solo para los juegos placeholder.

## Plan de implementación

1. **Guía y renombrado** — leer en `node_modules/next/dist/docs/` la guía de Client Components y de rutas dinámicas de Next 16. Renombrar `rocas` → `asteroides` en `lib/data.ts`, `lib/home-data.ts` y `app/globals.css`. Verificar que `/juegos/asteroides` y `/juegos/asteroides/jugar` resuelven y que `/juegos/rocas` da 404.
2. **Constantes y entidades** — portar `constants.ts` y `entities.ts` desde `game.js` a TypeScript estricto. Las entidades reciben el `ctx` por parámetro en `draw(ctx)` en vez de usar un global.
3. **Input** — `input.ts` con `keys`/`justPressed`, `attachInput()` que devuelve la función de limpieza y bloquea `preventDefault` solo en las teclas del juego y no en inputs de texto.
4. **Motor** — `engine.ts` con `createAsteroidsGame`: estado en closure, `update`/`draw`, loop con `requestAnimationFrame` y `dt` ≤ 50 ms, `pause`/`resume`/`restart`/`destroy`. Quitar HUD y overlay dibujados salvo el indicador de disparo triple, y emitir los callbacks en cada cambio de score, vidas, nivel y al pasar a `gameover`.
5. **Componente `AsteroidsCanvas`** — monta el motor en `useEffect`, expone el control por `ref`/props (`paused`, callbacks, `restartKey`), escala el canvas responsivo y se pausa con `visibilitychange`. Verificar que el doble montaje de Strict Mode no duplica el loop ni los listeners.
6. **Integrar en el reproductor** — en `jugar/page.tsx` renderizar `AsteroidsCanvas` solo para `asteroides`, conectar HUD, PAUSA/REANUDAR, FIN, modal de fin y JUGAR DE NUEVO; el timer simulado de score solo corre para los demás juegos. Texto de controles bajo el CRT.
7. **Pulido visual y verificación manual** — ajustar con `/frontend-design` el overlay de pausa y el texto de controles; jugar una partida completa: disparar, dividir asteroides, power-up, perder las 3 vidas, guardar puntuación, jugar de nuevo, salir y volver. Probar escritorio y ancho móvil (el canvas escala sin desbordar). Capturas en `.playwright-screenshot`.
8. **Cierre** — `npm run lint` y `npm run build`; revisar `git status` por archivos sobrantes.

## Criterios de aceptación

- [x] `/juegos/asteroides/jugar` muestra el canvas del juego dentro del marco CRT y la partida arranca sola con 4 asteroides grandes.
- [x] `/juegos/rocas` y `/juegos/rocas/jugar` devuelven 404; no queda ninguna referencia a `rocas`/`ROCAS` en `app/`, `lib/` ni `components/`.
- [x] La biblioteca, el detalle, el Salón y el home muestran "ASTEROIDES" con su portada (`cover-asteroides`).
- [x] `←`/`→` rotan, `↑` propulsa con inercia y `Space` dispara; la página no hace scroll con esas teclas.
- [x] Destruir asteroides grande/mediano/pequeño suma 20/50/100 y los grandes y medianos se parten en el tamaño inferior.
- [x] El HUD React muestra puntuación, vidas (♥) y nivel del motor en tiempo real; no hay HUD dibujado en el canvas salvo el indicador de disparo triple.
- [x] Al destruir todos los asteroides sube el nivel y aparecen más asteroides.
- [x] El power-up de disparo triple aparece, se recoge y dispara 3 balas durante su duración, con contador en el canvas.
- [x] Al chocar se pierde una vida, la nave reaparece con invencibilidad parpadeante; con 0 vidas se abre el modal "FIN DEL JUEGO" con la puntuación final correcta.
- [x] El botón FIN también abre el modal con la puntuación actual.
- [x] PAUSA congela asteroides, balas y temporizadores; REANUDAR continúa sin saltos. Cambiar de pestaña pausa la partida.
- [x] GUARDAR PUNTUACIÓN escribe en `av_scores` con `game: "asteroides"` y las iniciales indicadas; escribir en el input del modal no dispara ni mueve la nave.
- [x] JUGAR DE NUEVO reinicia score 0, 3 vidas y nivel 1 sin duplicar el loop (la velocidad del juego no aumenta tras reiniciar).
- [x] Al salir de la página y volver, o con Strict Mode en dev, no hay listeners ni `requestAnimationFrame` duplicados ni errores en consola.
- [x] Los demás juegos (`/juegos/<otro>/jugar`) conservan el placeholder simulado sin cambios.
- [x] El canvas escala en móvil sin desbordar la pantalla y mantiene proporción 4:3.
- [x] `npm run lint` y `npm run build` pasan sin errores.

## Decisiones tomadas y descartadas

- **Sí:** portar el motor a módulos TypeScript con `createAsteroidsGame(canvas, callbacks)` — elimina globals, permite limpieza en el desmontaje y comunica el score a React sin hacks.
- **No:** `iframe` a `public/` — la comunicación de score/pausa requiere `postMessage` y el juego no heredaría el estilo del reproductor.
- **No:** `next/script` con `game.js` tal cual — globals, listeners sin limpiar y difícil de reiniciar en Strict Mode.
- **Sí:** renombrar `rocas` → `asteroides` (id, título, clase de portada, home-data) — decisión del usuario; el juego se llama Asteroids y el id debe coincidir con la ruta.
- **No:** mantener un alias `/juegos/rocas` — no hay enlaces externos ni datos persistidos que lo requieran; un 404 limpio evita duplicados.
- **Sí:** HUD React del reproductor y modal de fin existentes — reutiliza el diseño del prototipo y evita duplicar HUD en el canvas.
- **No:** mantener el HUD y el overlay "GAME OVER" del original dibujados en canvas — quedarían duplicados con el HUD React.
- **Sí:** guardar con `saveScore` en localStorage — consistente con el estado actual; la migración de `av_scores` a Supabase va en otro spec.
- **Sí:** nivel del HUD tomado del motor — el cálculo `score / 2500` del placeholder no refleja el nivel real del juego.
- **No:** controles táctiles — amplían el alcance; se evalúan en un spec posterior.
- **Sí:** pausa automática al perder foco — evita perder una partida al cambiar de pestaña, sin costo adicional.
- **Sí:** el README del original no menciona los power-ups, pero el código sí — se portan, porque el código es la fuente de verdad.

## Riesgos identificados

| Riesgo                                                           | Mitigación                                                                                                     |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Strict Mode monta el efecto dos veces y duplica loop o listeners | `destroy()` cancela rAF y quita listeners; criterio de aceptación explícito.                                   |
| Teclas del juego interfieren con el input de iniciales del modal | Ignorar eventos con `event.target` en `input`/`textarea`; pausar/destruir el input al abrir el modal.          |
| `dt` grande al volver a la pestaña produce saltos                | Mantener tope de 50 ms y pausar con `visibilitychange`.                                                        |
| Canvas borroso en pantallas HiDPI o al escalar                   | Resolución lógica 800×600 fija escalada por CSS; revisar nitidez y decidir `devicePixelRatio` solo si se nota. |
| `Space` y flechas hacen scroll de la página                      | `preventDefault` solo sobre esas teclas mientras el juego está montado.                                        |
| El estado del HUD React se desincroniza del motor                | Los callbacks se emiten solo en cambios reales y el reinicio emite los valores iniciales.                      |
| Next 16 puede diferir en Client Components y params              | Leer la guía en `node_modules/next/dist/docs/` antes de integrar el reproductor.                               |

## Qué **no** está en este spec

- Puntuaciones en Supabase, Auth o leaderboard real.
- Controles táctiles y soporte móvil jugable.
- Audio y otros juegos (Tetris, Arkanoid).
- Cambios de mecánica o balance del original.
- Pantalla completa y pruebas automatizadas.
