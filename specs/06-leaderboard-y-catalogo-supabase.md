# 06 — Leaderboard real y tabla de juegos en Supabase

- **Estado:** Approved
- **Depende de:** SPEC 01, SPEC 04, SPEC 05
- **Fecha:** 2026-10-04

**Objetivo:** Crear las tablas `games` y `scores` en Supabase (con RLS), hacer de `games` la fuente del catálogo y guardar y mostrar puntuaciones reales de forma anónima (iniciales) en el Salón de la Fama.

## Alcance

**Incluido:**

- Migración SQL con las tablas `games` y `scores`, RLS, índices y `CHECK`s (ver Modelo de datos). Aplicada con el MCP `apply_migration` y copia del SQL en `supabase/migrations/`.
- Seed de los 8 juegos actuales de `lib/data.ts` en `games` (id, título, textos, categoría, clase de portada, color, orden). `scores` arranca vacía.
- `lib/data.ts` queda solo con tipos y `CATS`; se eliminan `GAMES` y `seededScores`. `GameCategory` y `color` se alinean con los valores de `games`.
- Capa de acceso a datos en `lib/games-repo.ts` (servidor, usa `lib/supabase/server.ts`): `getGames()`, `getGame(id)`, `getTopScores(gameId, limit)`, `getGameStats()` (best = `MAX(score)` y plays = `COUNT(*)` por juego, 0 si no hay partidas).
- Pantallas que pasan a leer de Supabase: biblioteca, home (preview de 6 juegos), detalle (`/juegos/[id]`, sidebar con top 10 real), reproductor (`/juegos/[id]/jugar`, resuelve el juego) y Salón de la Fama (tabs por juego, podio top 3 y tabla top 20 real). Las pantallas que hoy son Client Components se dividen en Server Component (datos) + componente cliente (interacción: filtros, tabs, tilt).
- Las cards muestran `best` y `plays` reales derivados de `scores`; sin partidas se muestra `—` y `0`. El formato abreviado ("12.4K") se calcula a partir del conteo real.
- Guardado de puntuación: Server Action `submitScore({ gameId, name, score })` en `app/juegos/[id]/jugar/actions.ts`, invocada desde el modal "FIN DEL JUEGO". Valida en servidor: juego existente, iniciales 1–3 caracteres `A-Z0-9` (se normalizan a mayúsculas), `score` entero entre 0 y 9.999.999. Si falla, el modal muestra el error y permite reintentar.
- Se elimina `saveScore`, `SavedScoreEntry` y la clave `av_scores` de `lib/session.ts`. El resto de la sesión `av_user` no se toca.
- Estados de UI: Salón y detalle con estado vacío ("AÚN NO HAY PUNTUACIONES — SÉ EL PRIMERO") y estado de error de carga; el podio funciona con 0, 1, 2 o 3 filas. Se usa `/frontend-design` para estos estados.
- Tras guardar, el Salón y el detalle se revalidan (`revalidatePath`) para mostrar la nueva marca.
- Regenerar `lib/supabase/database.types.ts` con el MCP y correr `get_advisors` (seguridad y rendimiento).

**No incluido (fuera de alcance de este spec):**

- Supabase Auth, perfiles, `proxy.ts` y asociar puntuaciones a un usuario. La fila "TU MEJOR MARCA" del Salón se elimina (sin identidad no hay "tu marca").
- Anti-trampas: rate limit, firma de partida o validación del score contra el motor. Solo validación de formato y rangos.
- Migrar o importar los `av_scores` existentes en localStorage (se descartan).
- Paginación, filtros por fecha (semanal/mensual) y búsqueda de jugador en el Salón.
- Realtime / actualización en vivo del leaderboard.
- Panel de administración para crear o editar juegos.
- Motores de juego nuevos (los placeholders siguen simulados; sus leaderboards quedan vacíos hasta que se guarden partidas).
- Cambios visuales del diseño base fuera de los estados vacío/error.
- Pruebas automatizadas (no hay test runner).

## Modelo de datos

Tablas en el esquema `public`:

```sql
create table public.games (
  id          text primary key,            -- slug de ruta: "asteroides"
  title       text not null,
  short       text not null,
  long        text not null,
  category    text not null check (category in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover       text not null,               -- clase CSS: "cover-asteroides"
  color       text not null check (color in ('cyan','magenta','yellow','green')),
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games(id) on delete cascade,
  name        text not null check (name ~ '^[A-Z0-9]{1,3}$'),
  score       integer not null check (score >= 0 and score <= 9999999),
  created_at  timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc, created_at);
```

RLS (ambas tablas habilitadas):

- `games`: `select` para `anon` y `authenticated`; sin `insert/update/delete`.
- `scores`: `select` para `anon` y `authenticated`; `insert` para `anon` y `authenticated` con `with check` que repite las reglas de `name` y `score`; sin `update/delete`.

Tipos de aplicación (sustituyen a `Game` de `lib/data.ts`):

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  category: GameCategory;
  cover: string;
  color: GameColor;
};
export type GameStats = { best: number | null; plays: number };
export type ScoreRow = { rank: number; name: string; score: number; date: string }; // date: DD/MM/YYYY
```

Archivos nuevos o modificados:

```
supabase/migrations/<timestamp>_games_and_scores.sql
lib/supabase/database.types.ts        // regenerado
lib/games-repo.ts                     // getGames, getGame, getTopScores, getGameStats
lib/data.ts                           // solo tipos + CATS
lib/session.ts                        // se elimina saveScore / av_scores
app/juegos/[id]/jugar/actions.ts      // submitScore (Server Action)
app/page.tsx, app/biblioteca/page.tsx, app/salon/page.tsx,
app/juegos/[id]/page.tsx, app/juegos/[id]/jugar/page.tsx  // datos desde servidor
components/*                          // clientes extraídos (filtros, tabs, tilt, modal)
```

Orden del leaderboard: `score desc, created_at asc` (el más antiguo gana el empate). Rank = posición en esa lista.

## Plan de implementación

1. **Guía y esquema** — leer en `node_modules/next/dist/docs/` las guías de Server Components, Server Actions, `revalidatePath` y Cache Components/data fetching de Next 16. Inspeccionar `list_tables` (vacío hoy).
2. **Migración** — aplicar con `apply_migration` las tablas, índice, checks y RLS; guardar el SQL en `supabase/migrations/`. Seed de los 8 juegos con `sort_order` igual al orden actual de `GAMES`.
3. **Tipos y repo** — regenerar `database.types.ts`; crear `lib/games-repo.ts` con las cuatro funciones, tipadas con `Database`. `getGameStats()` agrega en una sola consulta (no N+1). Recortar `lib/data.ts` a tipos y `CATS`.
4. **Catálogo desde BD** — biblioteca, home, detalle y reproductor leen `games` en servidor; extraer a componentes cliente lo interactivo. Cards con `best`/`plays` reales. La ruta con `id` inexistente da 404 (`notFound()`).
5. **Guardado** — `submitScore` con validación, insert y `revalidatePath("/salon")` y `/juegos/[id]`. Conectar el modal del reproductor (estado enviando / error / éxito) y quitar `saveScore` de `lib/session.ts`.
6. **Salón y detalle** — `/salon` con tabs por juego (`?juego=<id>` para enlazar y para SSR), podio y tabla top 20 reales; sidebar del detalle con top 10. Estados vacío y error, con `/frontend-design`. Eliminar la fila "TU MEJOR MARCA".
7. **Verificación manual** — jugar asteroides, guardar iniciales, ver la marca en Salón, detalle y card; guardar con iniciales inválidas y con score fuera de rango (rechazado); juego sin partidas (estado vacío); empate de score; 404 de juego inexistente. Probar escritorio y móvil. Capturas en `.playwright-screenshot`.
8. **Cierre** — `get_advisors` (seguridad y rendimiento), `npm run lint`, `npm run build`; revisar `git status` y que no queden referencias a `GAMES`, `seededScores`, `saveScore` ni `av_scores`.

## Criterios de aceptación

- [ ] Existen `public.games` y `public.scores` con RLS habilitada y el SQL versionado en `supabase/migrations/`.
- [ ] `games` contiene los 8 juegos con los mismos id, títulos y portadas que el catálogo actual; `scores` empieza vacía.
- [ ] Con la clave publishable, `anon` puede `select` en ambas tablas e `insert` en `scores`, y no puede `update`/`delete` ni escribir en `games` (verificado con SQL/REST).
- [ ] Un `insert` directo con `name` de 4 caracteres, minúsculas o `score` negativo/> 9.999.999 es rechazado por la BD.
- [ ] No quedan `GAMES`, `seededScores`, `saveScore` ni `av_scores` en `app/`, `lib/` ni `components/`.
- [ ] Biblioteca, home, detalle y reproductor muestran los juegos desde Supabase; `/juegos/inexistente` devuelve 404.
- [ ] Las cards muestran `best` y `plays` calculados desde `scores`; sin partidas muestran `—` y `0`.
- [ ] Terminar una partida de asteroides y guardar con iniciales válidas crea una fila en `scores` con `game_id: "asteroides"`.
- [ ] Iniciales vacías, de más de 3 caracteres o con símbolos, o un score fuera de rango, se rechazan en la Server Action y el modal muestra el error sin cerrarse.
- [ ] Si falla la escritura (p. ej. sin red), el modal muestra el error y permite reintentar sin perder la puntuación.
- [ ] El Salón muestra por cada juego el podio top 3 y la tabla top 20 ordenados por `score desc, created_at asc` con rango, iniciales, puntuación y fecha DD/MM/YYYY.
- [ ] La puntuación recién guardada aparece en el Salón y en el sidebar del detalle sin recargar manualmente más allá de navegar a la pantalla.
- [ ] Un juego sin puntuaciones muestra el estado vacío en Salón y detalle; el podio no se rompe con 0, 1 o 2 filas.
- [ ] Un fallo de lectura muestra el estado de error en Salón y detalle sin romper la página.
- [ ] `/salon?juego=<id>` abre la pestaña de ese juego; un id inválido cae al primer juego.
- [ ] La fila "TU MEJOR MARCA" ya no existe y la sesión `av_user` sigue funcionando.
- [ ] No hay claves `service_role` ni secretas en el código; `get_advisors` no reporta problemas críticos de seguridad.
- [ ] `npm run lint` y `npm run build` pasan sin errores.

## Decisiones tomadas y descartadas

- **Sí:** `games` como única fuente del catálogo — evita dos fuentes de verdad; el spec 04 ya fijó que cada tabla llega junto con las pantallas que la usan.
- **No:** dejar `GAMES` en `lib/data.ts` y solo mover el Salón — duplicaría el catálogo y se desincronizaría.
- **Sí:** puntuaciones anónimas con iniciales (estilo arcade) — Auth es otro dominio de decisión y va en otro spec.
- **No:** incluir Supabase Auth aquí — mezcla proveedores, sesión y RLS por usuario en un spec que ya toca datos y UI.
- **Sí:** `INSERT` público por RLS con `CHECK`s + validación en Server Action — doble capa de formato aunque no evite scores falsos.
- **No:** rate limit ni verificación del score — complejidad sin Auth. Riesgo aceptado y registrado.
- **Sí:** `best` y `plays` derivados de `scores` — datos reales; los valores mock del catálogo dejan de existir.
- **No:** columnas estáticas `best`/`plays` — se desincronizarían de las partidas reales.
- **Sí:** eliminar `av_scores`/`saveScore` sin migración — eran datos de pruebas locales y no tienen consumidor.
- **Sí:** eliminar la fila "TU MEJOR MARCA" — sin identidad verificable no se puede saber cuál es la marca del usuario.
- **Sí:** el detalle del juego también lee el top real (decisión derivada) — `seededScores` desaparece, mantener un mock ahí sería incoherente. El usuario solo pidió el Salón; el detalle reutiliza la misma consulta.
- **Sí:** juegos sin motor quedan con leaderboard vacío (sin scores ficticios) — decisión del usuario; el estado vacío es parte del diseño.
- **Sí:** tabs del Salón por query param `?juego=` — enlazable y renderizable en servidor.
- **Sí:** id de juego `text` (slug) como PK — coincide con la ruta y evita joins para resolver URLs.
- **Sí:** empate gana el más antiguo — regla simple y determinista.

## Riesgos identificados

| Riesgo                                                                           | Mitigación                                                                                                |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Cualquiera puede insertar scores falsos con la clave publishable                 | Aceptado hasta el spec de Auth; `CHECK`s de formato y rango. Revisar antes de promocionar el Salón.       |
| Spam / inserciones masivas en `scores`                                           | Sin mitigación en este spec; monitorizar con `get_advisors`/logs y añadir rate limit con Auth.            |
| Alcance grande (BD + 5 pantallas + guardado)                                     | Plan en pasos que dejan el sistema funcional; cada pantalla se migra por separado antes del cierre.       |
| Convertir Client Components a Server + cliente rompe filtros, tabs o tilt        | Extraer solo lo interactivo a componentes cliente y verificar cada pantalla en el paso 7.                 |
| Cambios en cache/`revalidatePath` de Next 16 respecto a lo conocido              | Leer las guías en `node_modules/next/dist/docs/` antes del paso 4 y verificar que la marca nueva aparece. |
| Un solo proyecto Supabase para dev y prod: las pruebas dejan filas en producción | Limpiar las filas de prueba con `execute_sql` al cerrar; revisar la separación de entornos más adelante.  |
| Pérdida de `av_scores` locales                                                   | Aceptado: eran datos de prueba.                                                                           |
| Tabla `scores` sin límites de crecimiento                                        | Índice `(game_id, score desc)` y consultas con `limit`; la retención se evalúa más adelante.              |

## Qué **no** está en este spec

- Supabase Auth, perfiles y puntuaciones ligadas a un usuario.
- Anti-trampas, rate limit o validación del score contra el motor.
- Paginación, filtros por periodo, búsqueda y Realtime.
- Administración del catálogo y juegos nuevos.
- Migración de `av_scores` y pruebas automatizadas.
