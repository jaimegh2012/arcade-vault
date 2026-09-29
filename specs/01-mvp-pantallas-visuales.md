# 01 — MVP visual: pantallas de Arcade Vault

- **Estado:** Approved
- **Depende de:** Ninguno (primer spec del proyecto)
- **Fecha:** 2026-09-28

**Objetivo:** Portar las cinco pantallas del prototipo de referencia (`references/templates`) a rutas reales de Next.js App Router, con el mismo diseño visual y los mismos estados simulados (sesión, filtros, puntuación), sin implementar ningún motor de juego real.

## Alcance

**Incluido:**

- Cinco rutas reales de App Router equivalentes a las pantallas del prototipo:
  - `/` — Biblioteca (catálogo, búsqueda, filtro por categoría).
  - `/juegos/[id]` — Detalle de juego (portada, descripción, stats, leaderboard del juego).
  - `/juegos/[id]/jugar` — Reproductor (HUD, arena CRT de relleno, pausa, modal de fin de partida).
  - `/auth` — Inicio de sesión / creación de cuenta / invitado.
  - `/salon` — Salón de la Fama (pestañas por juego, podio top-3, tabla completa).
- `Nav` (con panel móvil) y footer montados en `app/layout.tsx`, visibles en todas las rutas.
- Datos mock portados literalmente desde `data.jsx` a `lib/data.ts` (catálogo `GAMES`, `CATS`, `seededScores`).
- Sesión y puntuación simuladas con `localStorage`, mismas claves que el prototipo (`av_user`, `av_scores`), centralizadas en `lib/session.ts`.
- Ticker falso de puntuación en el reproductor (incrementa la puntuación automáticamente) para poder mostrar pausa, fin de partida y guardado de puntuación.
- Fidelidad visual completa con `references/templates/Arcade Vault.html`: colores, tipografías (Press Start 2P / JetBrains Mono / Courier Prime, ya cargadas en `app/layout.tsx`), efectos CRT/scanline/glow (ya portados en `app/globals.css`), y comportamiento responsive (nav hamburguesa en móvil).

**No incluido (fuera de alcance de este spec):**

- Cualquier motor de juego real o lógica jugable — el "juego" del reproductor sigue siendo un ticker de puntuación falso, igual que en el prototipo.
- Autenticación real (validación de credenciales, contraseñas, OAuth con Google/GitHub, backend, base de datos). Los botones sociales quedan decorativos y el login/registro acepta cualquier valor.
- Persistencia de puntuaciones compartida entre usuarios/navegadores — `av_scores` es solo local al navegador, como en el prototipo.
- El contador de "Créditos" del Nav — es decorativo, no consume nada.
- Pruebas automatizadas (no hay test runner configurado en el repo).
- Cualquier SEO/metadata adicional más allá de la ya definida en `app/layout.tsx`.

## Modelo de datos

Todo vive en el cliente (sin backend). Tipos y datos en TypeScript:

**`lib/data.ts`**

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;   // clase CSS del fondo de portada (ya definida en globals.css)
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;   // formato ya redondeado, ej. "12.4K"
};

export const GAMES: Game[];               // los mismos 8 juegos del prototipo
export const CATS: readonly ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];

export type ScoreRow = { rank: number; name: string; score: number; date: string };
export function seededScores(seed: number, count?: number): ScoreRow[]; // misma fórmula determinista que el prototipo
```

**`lib/session.ts`**

```ts
export type User = { name: string };
export type SavedScoreEntry = { game: string; score: number; name: string; at: number };

export function getUser(): User | null;         // lee "av_user" de localStorage
export function setUser(user: User | null): void; // escribe/borra "av_user"
export function saveScore(entry: Omit<SavedScoreEntry, "at">): void; // agrega a "av_scores"
```

Todas las funciones que tocan `localStorage` se protegen con `try/catch` y devuelven un valor seguro si `window`/`localStorage` no está disponible (render en servidor).

## Plan de implementación

1. **`lib/data.ts`** — portar tipos, `GAMES`, `CATS` y `seededScores` desde `references/templates/data.jsx`.
2. **`lib/session.ts`** — helpers de sesión y puntuación sobre `localStorage` (`av_user`, `av_scores`).
3. **`components/nav.tsx`** — portar `nav.jsx` a client component: `usePathname()` para resaltar el link activo, `next/link` para navegar, panel móvil deslizante, botón de sesión (nombre + cerrar sesión, o "Iniciar Sesión") usando `lib/session.ts`.
4. **`app/layout.tsx`** — montar `<Nav />` y el footer alrededor de `{children}` (se conserva la carga de fuentes ya existente).
5. **`components/game-card.tsx`** — portar `GameCard` de `biblioteca.jsx` (efecto tilt al mover el mouse, badge de mejor puntuación, botón "JUGAR").
6. **`app/page.tsx`** — portar `Library`: hero, buscador, chips de categoría, grid de `GameCard`, estado "sin resultados". Client component (estado de búsqueda/filtro).
7. **`components/leaderboard.tsx`** — lista de puntuaciones rankeadas reutilizable (usada en detalle).
8. **`app/juegos/[id]/page.tsx`** — portar `GameDetail`: portada, tags, descripción, stats, acciones ("JUGAR AHORA" → `/juegos/[id]/jugar`, "VOLVER AL VAULT" → `/`), leaderboard lateral vía `seededScores`. `notFound()` si el `id` no existe en `GAMES`.
9. **`app/juegos/[id]/jugar/page.tsx`** — portar `GamePlayer`: HUD (jugador/puntuación/vidas/nivel), arena CRT de relleno, pausa, ticker falso de puntuación (`setInterval`), botón "FIN" → modal de fin de partida con input de iniciales y guardado vía `lib/session.saveScore`. Client component. `notFound()` si el `id` no existe.
10. **`app/auth/page.tsx`** — portar `Auth`: tabs "Iniciar sesión"/"Crear cuenta", formulario sin validación, botones sociales decorativos, botón "Jugar como invitado". Al enviar, `lib/session.setUser(...)` y redirigir a `/` con `useRouter().push`.
11. **`components/podium.tsx`** y **`app/salon/page.tsx`** — portar `HallOfFame`: pestañas por juego, podio top-3, tabla completa, fila "tu mejor marca" cuando hay sesión iniciada (misma fórmula de ejemplo `youRank`/`youScore` del prototipo).
12. **Verificación manual** — recorrer las 5 rutas en `npm run dev`, comparar visualmente con `references/templates/Arcade Vault.html` (desktop y móvil), probar cada estado (búsqueda/filtro, login/invitado/logout, pausa/fin/guardar puntuación, pestañas del salón), y correr `npm run lint` + `npm run build`.

## Criterios de aceptación

- [ ] Las 5 rutas (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/auth`, `/salon`) renderizan sin errores dentro del layout con `Nav` y footer.
- [ ] `/` filtra el catálogo por texto y por categoría, y muestra el estado "NO HAY RESULTADOS" cuando no hay coincidencias.
- [ ] `/juegos/[id]` muestra portada, tags, descripción, stats y la tabla de mejores puntuaciones generada con `seededScores`; un `id` inexistente da 404.
- [ ] El botón "JUGAR AHORA" navega a `/juegos/[id]/jugar`.
- [ ] `/juegos/[id]/jugar` muestra el HUD, incrementa la puntuación automáticamente, permite pausar/reanudar, y "FIN" abre el modal de fin de partida.
- [ ] El modal de fin de partida guarda `{game, score, name}` en `av_scores` (localStorage) al confirmar, y muestra el toast "PUNTUACIÓN GUARDADA".
- [ ] `/auth` permite iniciar sesión, crear cuenta (cualquier valor, sin validar) o entrar como invitado, y redirige a `/` en los tres casos.
- [ ] Tras iniciar sesión, el nombre de usuario aparece en el `Nav` con opción de cerrar sesión; sin sesión se muestra "Iniciar Sesión".
- [ ] `/salon` muestra pestañas por juego, podio top-3 y tabla completa; si hay sesión iniciada, resalta la fila "tu mejor marca en {juego}".
- [ ] El diseño visual (colores, tipografías, glow/scanline/CRT, nav hamburguesa en móvil) coincide con `references/templates/Arcade Vault.html`.
- [ ] `npm run lint` y `npm run build` pasan sin errores.

## Decisiones tomadas y descartadas

- **Rutas reales de App Router** en vez de replicar el router por hash del prototipo — el hash-router era un workaround del prototipo standalone sin build step; Next.js ya da routing real e idiomático.
- **Persistencia en `localStorage`** (`av_user`, `av_scores`) igual que el prototipo — no hay backend ni auth real todavía; se reemplazará en un spec futuro de autenticación real. Se aisló en `lib/session.ts` para facilitar ese reemplazo.
- **Ticker falso de puntuación** en el reproductor — es lógica de UI pura (no un juego real), necesaria para poder demostrar visualmente pausa, fin de partida y guardado de puntuación.
- **Datos mock portados literalmente** desde `data.jsx` a `lib/data.ts` — mantiene fidelidad exacta con el prototipo de referencia en vez de inventar un catálogo nuevo.
- **Sin validación de formulario en `/auth`** — fiel al prototipo; evita construir lógica de validación que se descartará cuando llegue autenticación real.
- **Componentes compartidos en `components/`, lógica de cada pantalla en su `page.tsx`** — `Nav`, `GameCard`, `Leaderboard` y `Podium` se reutilizan; el resto de la orquestación (estado de búsqueda, tabs, ticker) vive en la página que la necesita, sin abstracciones prematuras.

## Riesgos identificados

- Mezclar la sesión "falsa" de `localStorage` con rutas que en el futuro necesiten sesión de servidor puede requerir refactor cuando llegue autenticación real. Mitigación: toda la lógica de sesión está aislada en `lib/session.ts`.
