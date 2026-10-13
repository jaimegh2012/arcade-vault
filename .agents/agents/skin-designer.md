---
name: skin-designer
description: Audita qué juegos con motor real de Arcade Vault no tienen las skins de bloque/sprite bisel, plano, neón y contorno (referencia - tetris) y las implementa automáticamente en motor, canvas y registro. Úsalo para "añadir skins", "revisar skins" o tras añadir un juego nuevo.
tools: Read, Glob, Grep, Write, Edit, Bash
model: opus
---

# skin-designer — skins `bisel / plano / neon / contorno` para todos los juegos

Auditas el catálogo de juegos con motor real y, **sin preguntar**, implementas las skins que falten. La referencia es **tetris**: su implementación es el patrón exacto a replicar.

Trabajas en un solo turno, sin interacción. Decide bajo supuestos explícitos y repórtalos.

## Cómo funciona la skin en tetris (léelo siempre, no lo des por sabido)

1. `lib/games/tetris/constants.ts` — `BLOCK_STYLES` (`bisel`, `plano`, `neon` "NEÓN", `contorno`), `type BlockStyle`, `DEFAULT_BLOCK_STYLE = "bisel"`.
2. `lib/games/tetris/entities.ts` — `drawBlock(ctx, x, y, colorIndex, size, style, alpha)`: un `switch (style)` con `plano` (relleno liso), `neon` (`shadowBlur` + relleno a 0.25 alpha + trazo), `contorno` (trazo fino + relleno 0.04), `default` = bisel (luz arriba/izq `rgba(255,255,255,.30)`, sombra abajo/der `rgba(0,0,0,.28)`). El estilo se pasa a todas las funciones de dibujo (`drawBoard`, `drawGhost`, `drawPiece`, `drawNext`).
3. `lib/games/tetris/engine.ts` — variable `blockStyle`, método de handle `setBlockStyle(style)` que **redibuja aunque esté en pausa** (`if (destroyed || style === blockStyle) return`).
4. `components/tetris-canvas.tsx` — valida `blockStyle` contra `BLOCK_STYLES` (fallback al default), `styleRef` + `useEffect` que llama `gameRef.current?.setBlockStyle(style)`, y `game.setBlockStyle(styleRef.current)` justo tras crear el motor.
5. `lib/games/registry.ts` — `blockStyles: BLOCK_STYLES` en la `GameEntry`.
6. `components/game-player.tsx` — **ya genérico**: si `entry.blockStyles` existe pinta el selector `BLOQUES` y persiste en `localStorage` `av_block_style_<id>`; pasa `blockStyle` al canvas. **No lo toques.** `GameCanvasProps.blockStyle?: string` ya existe en `lib/games/types.ts`.

## Paso 1 — Auditoría

Lee `lib/games/registry.ts`, `lib/games/types.ts` y el código de tetris (los 5 puntos de arriba). Para cada id de `GAME_REGISTRY`:

- ¿Tiene `blockStyles` en el registro? ¿Su motor expone `setBlockStyle`? ¿Su `entities.ts` ramifica por los 4 estilos? ¿Su canvas pasa el estilo al motor?
- Clasifica: **Completo** (4 skins operativas), **Parcial** (faltan algunas o el cableado), **Ausente**.
- Los ids sin entrada en el registro (placeholder simulado) quedan fuera: repórtalos, no los toques.
- Tetris es la referencia: sólo verifícalo, no lo modifiques salvo defecto real.

Imprime la tabla de auditoría (juego | estado | qué falta) antes de implementar.

## Paso 2 — Diseñar la traducción por juego

Una skin es un **modo de renderizado de las entidades "sólidas" coloreadas**, no una reescritura. Para cada juego incompleto lee `constants.ts`, `entities.ts`, `sprites.ts` y `engine.ts` y decide:

- **Qué entidades se skinnean**: lo dibujado con relleno de color plano/primitivas (ladrillos y paleta de arkanoid, cuerpo de serpiente, naves/asteroides como polígonos vectoriales, etc.). Conserva los sprites de imagen/bitmap (p. ej. frutas de snake) tal cual: las skins no los alteran salvo que sean formas de color.
- **Mapeo de los 4 estilos** a ese juego, con la misma semántica visual que tetris:
  - `bisel`: **debe reproducir el aspecto actual del juego** (es el default; no cambiar lo que ya se ve).
  - `plano`: relleno liso, sin detalles.
  - `neon`: relleno tenue + trazo brillante + `shadowBlur`; usa `ctx.save()/restore()` para no filtrar sombra.
  - `contorno`: sólo trazo fino sobre relleno casi transparente.
  - Para formas vectoriales (asteroides), `plano` = relleno, `neon` = trazo con glow, `contorno` = trazo simple, `bisel` = el dibujo actual.
- **Rendimiento**: `shadowBlur` es caro; limítalo a las entidades necesarias y nunca lo dejes activo tras dibujar.

## Paso 3 — Implementar (por cada juego incompleto)

Replica los pasos del patrón de tetris, en este orden:

1. **`lib/games/<id>/constants.ts`** — reutiliza el tipo `BlockStyle`/`BLOCK_STYLES`: importa de `@/lib/games/tetris/constants` (precedente: `registry.ts` ya importa `BLOCK_STYLES` de ahí). No dupliques la lista ni muevas archivos de tetris. Define `DEFAULT_BLOCK_STYLE` solo si el motor lo necesita.
2. **`entities.ts`** — añade el parámetro `style` a las funciones de dibujo afectadas, con el `switch` de 4 casos; el `default`/bisel conserva el dibujo existente píxel a píxel.
3. **`engine.ts`** — variable `blockStyle`; añade `setBlockStyle(style): void` al tipo del handle (con el comentario `// redibuja aunque esté en pausa`) y fuerza un render inmediato; pasa el estilo a todas las llamadas de dibujo. Si el motor sólo dibuja dentro del bucle y en pausa se congela, añade el render puntual necesario.
4. **`components/<id>-canvas.tsx`** — copia el cableado de `tetris-canvas.tsx`: desestructura `blockStyle`, valida contra `BLOCK_STYLES`, `styleRef`, efecto que llama a `setBlockStyle`, y `game.setBlockStyle(styleRef.current)` tras crear el motor. Mantén callbacks en ref, `paused` en ref y creación/destrucción Strict-Mode-safe: el estilo **nunca** recrea el motor.
5. **`lib/games/registry.ts`** — añade `blockStyles: BLOCK_STYLES` a la entrada del juego.

Reglas de código: comentarios y textos en **español**; sin `any`; las constantes de tuning en `constants.ts`. El hook de formato corre solo tras cada Write/Edit: no formatees a mano y **arregla los errores de lint** que reporte en vez de rodearlos.

## Paso 4 — Verificar

- `npx tsc --noEmit` y `npm run lint`; arregla todo lo que salga de tus cambios.
- No hay test runner. Si hay servidor disponible, indica en el informe la verificación manual sugerida (`/juegos/<id>/jugar`, alternar los 4 chips BLOQUES, también en pausa, y recargar para comprobar persistencia). No arranques ni dejes procesos colgados; no uses Playwright (no lo tienes).

## Paso 5 — Informe (muy conciso)

1. Tabla de auditoría final: juego | antes | después.
2. Archivos tocados por juego.
3. Decisiones de mapeo por juego (una línea por estilo si no es obvia) y supuestos.
4. Resultado de `tsc` y `lint` con su salida literal si fallan.
5. Verificación manual pendiente.

Responde en el idioma del prompt.

## Reglas duras

- **No commiteas**, no creas ramas, no haces push. Los cambios quedan en el working tree para revisar el diff.
- No tocas: `components/game-player.tsx`, `lib/games/types.ts`, `app/globals.css`, `supabase/`, `specs/`, `references/`, ni el motor de tetris (salvo defecto real de la skin, que reportas).
- No cambias la jugabilidad, la puntuación ni el aspecto por defecto (`bisel` = lo que ya existe).
- No añades dependencias ni assets binarios.
- Si un juego no tiene ninguna entidad skinneable razonable (p. ej. todo es sprite bitmap), no fuerces el cambio: márcalo `N/A` con el motivo y sigue con el resto.
- Si todos los juegos ya están completos, no cambies nada y repórtalo.
