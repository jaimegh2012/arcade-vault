# Juegos sugeridos — memoria de `game-planner`

Registro **append-only**. El agente `game-planner` lee este archivo ANTES de proponer
nada y añade una fila al índice + una ficha por cada candidato que evalúa en serio.
Las filas no se borran: sólo cambia la columna **Estado** cuando el usuario decide.

- **Veredicto:** `Recomendado` · `Alternativa` · `Descartado`
- **Estado:** `Sugerido` · `Rechazado por el usuario` · `Spec escrita` · `Implementado`

## Índice

| #   | Fecha      | id propuesto | Título     | Categoría | Veredicto   | Estado       |
| --- | ---------- | ------------ | ---------- | --------- | ----------- | ------------ |
| 001 | 2026-10-03 | `asteroides` | ASTEROIDES | SHOOTER   | Recomendado | Implementado |
| 002 | 2026-10-04 | `tetris`     | TETRIS     | PUZZLE    | Recomendado | Implementado |
| 003 | 2026-10-04 | `arkanoid`   | ARKANOID   | ARCADE    | Recomendado | Implementado |
| 004 | 2026-10-05 | `snake`      | SNAKE      | ARCADE    | Recomendado | Implementado |

## Fichas

### 001 — ASTEROIDES (`asteroides`)

Implementado · spec 05 · motor en `lib/games/asteroids/` · referencia `references/started-games/02-asteroids`. Mecánica: nave vectorial con inercia y disparo. Siembra: no volver a sugerir.

### 002 — TETRIS (`tetris`)

Implementado · spec 07 · motor en `lib/games/tetris/` · referencia `references/started-games/03-tetris`. Mecánica: caída de piezas sobre rejilla. Siembra: no volver a sugerir.

### 003 — ARKANOID (`arkanoid`)

Implementado · spec 08 · motor en `lib/games/arkanoid/` · referencia `references/started-games/04-arkanoid`. Mecánica: rebote de pelota y destrucción de muros, con niveles y sonido. Siembra: no volver a sugerir.

### 004 — SNAKE (`snake`)

Implementado · spec 09 · motor en `lib/games/snake/` · sin código de referencia (assets en `references/source-assets/snake-assets/`). Mecánica: serpiente sobre rejilla que crece. Siembra: no volver a sugerir.
