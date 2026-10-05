# Plantilla de spec de juego nuevo

Referencia para `/add-game`. **No se copia literal**: es la forma que debe respetar el spec generado. Sustituye `<id>` (slug de ruta, p. ej. `tetris`), `<Name>` (PascalCase) y `NN` por los valores reales. Estructura base: `.claude/skills/spec/template.md`; contenido modelado en `specs/05-juego-asteroides.md` y `specs/06-leaderboard-y-catalogo-supabase.md`.

---

## Cabecera

```markdown
# NN — Juego <TÍTULO> jugable con leaderboard

- **Estado:** Borrador
- **Depende de:** SPEC 05, SPEC 06
- **Fecha:** YYYY-MM-DD

**Objetivo:** Una sola frase: portar `references/started-games/<carpeta>` (o describir el juego) a un módulo TypeScript jugable en `/juegos/<id>/jugar` con su leaderboard en Supabase.
```

## Alcance — Incluido (checklist de cobertura)

1. **Catálogo** — fila en `games` (insert de juego nuevo, o update si reemplaza un placeholder): `id`, `title`, `short`, `long` (sin mencionar mecánicas que el juego no tiene), `category`, `color`, `cover`, `sort_order`. Migración `supabase/migrations/<timestamp>_game_<id>.sql` aplicada con `apply_migration`. Portada `.cover-<id>` en `app/globals.css` si es nueva.
2. **Motor** en `lib/games/<id>/`: `constants.ts`, `entities.ts` (si aplica), `input.ts`, `engine.ts`.
   - Sin globals de módulo ni `document.getElementById`; entidades reciben `ctx` por parámetro.
   - API: `create<Name>Game(canvas, callbacks)` → `{ start, pause, resume, restart, destroy }`.
   - Callbacks: `onScore`, `onGameOver(finalScore)` y, según el juego, `onLives`, `onLevel`.
   - Loop `requestAnimationFrame` con `dt` ≤ 50 ms; `destroy()` cancela rAF y quita listeners.
   - Input ignora teclas con foco en `input`/`textarea`; `preventDefault` solo en las teclas del juego.
   - Se elimina el HUD y el overlay de game over dibujados en canvas (los hace React); solo se conserva lo que el HUD React no puede mostrar.
   - Constantes y puntuación idénticas al original (el código manda sobre el README).
3. **Componente cliente** `components/<id>-canvas.tsx` (`"use client"`), patrón de `components/asteroids-canvas.tsx`: callbacks vía ref, props `paused` y `restartKey`, `onAutoPause` con `visibilitychange`, seguro con Strict Mode, canvas lógico fijo escalado por CSS dentro de `.crt-screen` (`aspect-ratio` según el juego).
4. **Registro de juegos** `lib/games/registry.ts`: mapa `id → { Canvas, controls, engineLevel, hasLives }`.
   - Si no existe, el spec lo crea y migra `asteroides` al registro como parte del plan (sin cambiar su comportamiento).
   - `components/game-player.tsx` sustituye `isAsteroids` por consulta al registro: HUD (vidas/nivel del motor o derivado), texto de controles (`.controls-hint`) y canvas salen del registro; los ids sin entrada mantienen el placeholder simulado.
5. **Leaderboard** — sin cambios de esquema: el guardado usa `submitScore({ gameId: "<id>", name, score })` y el Salón (`/salon?juego=<id>`) y el detalle leen por `game_id`. Verificar que aparece la marca nueva, estado vacío con 0 partidas y revalidación.
6. **Pulido visual** con `/frontend-design` (portada, overlay de pausa si cambia, hint de controles).
7. Regenerar `lib/supabase/database.types.ts` **solo** si cambia el esquema; `get_advisors` al cierre.

## Alcance — No incluido (por defecto)

- Controles táctiles/móvil jugable, audio, pantalla completa, guardado de partida en curso.
- Auth, anti-trampas, rate limit, scores ligados a usuario.
- Cambios de mecánica, balance o reglas del original.
- Otros juegos del catálogo; pruebas automatizadas (no hay test runner).
- Cualquier decisión que el usuario difiera durante las preguntas (anotarla aquí).

## Modelo de datos

- SQL de la migración (insert/update de `games`) con valores reales; respetar los `CHECK`: `category in ('ARCADE','PUZZLE','SHOOTER','VERSUS')`, `color in ('cyan','magenta','yellow','green')`.
- Tipos públicos del motor (callbacks y API), con los campos opcionales que aplique.
- Entrada del registro (tipo `GameEntry`).
- Lista de archivos nuevos/modificados en bloque de código, como en el spec 05.

## Plan de implementación (cada paso deja el sistema funcional)

1. **Guía y estado base** — leer en `node_modules/next/dist/docs/` Client Components y rutas dinámicas de Next 16; confirmar con `list_tables` el catálogo actual.
2. **Migración del catálogo** — SQL en `supabase/migrations/` + `apply_migration`; portada nueva si aplica. Verificar `/juegos/<id>` y que el leaderboard sigue vacío.
3. **Constantes y entidades** — portar a TypeScript estricto.
4. **Input** — `attach/detach`, teclas del juego, ignorar inputs de texto.
5. **Motor** — estado en closure, update/draw, callbacks solo en cambios reales, `pause/resume/restart/destroy`.
6. **Componente canvas** — montaje en `useEffect`, Strict Mode, escalado.
7. **Registro y reproductor** — crear/ampliar `lib/games/registry.ts`, migrar `game-player.tsx` al registro (si es el primer juego tras asteroides, migrarlo también y verificarlo).
8. **Pulido y verificación manual** — partida completa, game over, guardar iniciales, ver marca en Salón, detalle y card, jugar de nuevo, salir/volver, escritorio y móvil. Capturas en `.playwright-screenshot`.
9. **Cierre** — `get_advisors`, `npm run lint`, `npm run build`, `git status`; limpiar filas de prueba de `scores` con `execute_sql`.

## Criterios de aceptación (base; ampliar con los específicos del juego)

- [ ] `/juegos/<id>/jugar` muestra el juego dentro del marco CRT y arranca según lo definido.
- [ ] Controles definidos funcionan; la página no hace scroll con las teclas del juego.
- [ ] Cada acción puntúa exactamente lo definido (listar valores concretos).
- [ ] El HUD React muestra puntuación (y vidas/nivel si aplica) del motor en tiempo real; no hay HUD dibujado en canvas salvo lo declarado.
- [ ] Condición de fin definida abre el modal "FIN DEL JUEGO" con la puntuación correcta; FIN también lo abre.
- [ ] PAUSA congela la simulación y REANUDAR continúa sin saltos; cambiar de pestaña pausa.
- [ ] Guardar iniciales válidas crea una fila en `scores` con `game_id: "<id>"`; iniciales inválidas se rechazan sin cerrar el modal.
- [ ] La marca aparece en el Salón (`/salon?juego=<id>`), en el sidebar del detalle y en `best`/`plays` de la card.
- [ ] Sin partidas: estado vacío en Salón y detalle.
- [ ] JUGAR DE NUEVO reinicia sin duplicar loop ni listeners; Strict Mode sin duplicados ni errores en consola.
- [ ] `asteroides` y los demás juegos conservan su comportamiento tras el registro.
- [ ] `games` contiene la fila de `<id>` con los valores acordados y respeta los `CHECK`.
- [ ] El canvas escala en móvil sin desbordar y mantiene la proporción.
- [ ] `get_advisors` sin problemas críticos nuevos; `npm run lint` y `npm run build` pasan.

## Decisiones tomadas y descartadas (mínimo a incluir)

- **Sí:** motor TypeScript con `create<Name>Game(canvas, callbacks)` — sin globals, limpieza al desmontar. **No:** `iframe` ni `next/script` con el `game.js` tal cual.
- **Sí:** HUD y modal de fin de React; **No:** HUD/overlay dibujados en canvas.
- **Sí:** registro `lib/games/registry.ts` — **No:** un `isX` por juego en `game-player.tsx`.
- **Sí:** guardado con `submitScore` existente y `games` como fuente del catálogo — **No:** tablas por juego ni localStorage.
- Más las decisiones específicas surgidas en las preguntas (catálogo, controles, mecánicas cambiadas).

## Riesgos (mínimo a incluir, ampliar según el juego)

| Riesgo                                              | Mitigación                                                           |
| --------------------------------------------------- | -------------------------------------------------------------------- |
| Strict Mode duplica loop o listeners                | `destroy()` completo; criterio de aceptación explícito.              |
| Teclas del juego interfieren con el input del modal | Ignorar eventos con target `input`/`textarea`.                       |
| `dt` grande al volver a la pestaña                  | Tope de 50 ms y pausa con `visibilitychange`.                        |
| Scores falsos con clave publishable                 | Aceptado hasta el spec de Auth; `CHECK`s de formato y rango.         |
| Un solo proyecto Supabase para dev y prod           | Limpiar filas de prueba de `scores` al cerrar.                       |
| Refactor del registro rompe `asteroides`            | Verificar asteroides completo antes del cierre.                      |
| Id/slug distinto del `id` de `games` rompe la ruta  | El `id` de la fila y la carpeta `lib/games/<id>` usan el mismo slug. |

## Qué **no** está en este spec

Repetir al final: táctil, audio, Auth/anti-trampas, cambios de mecánica, otros juegos, pruebas automatizadas.
