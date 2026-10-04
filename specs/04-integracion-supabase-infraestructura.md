# 04 — Integración de Supabase (infraestructura base)

- **Estado:** Implemented
- **Depende de:** SPEC 01, SPEC 03
- **Fecha:** 2026-10-03

**Objetivo:** Dejar Supabase integrado en el proyecto Next.js (dependencias, variables de entorno, clientes de navegador y servidor tipados) y verificar la conexión, sin tablas, sin auth y sin cambios visibles en la UI.

## Alcance

**Incluido:**

- Dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- Proyecto Supabase único (dev y prod) con `project_ref` `zhxfzcjwvakzvydurxke`, el mismo de `.mcp.json`.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local` (valores reales, obtenidos con el MCP `get_project_url` y `get_publishable_keys`) y documentadas sin valores en `.env.example`.
- Cliente de navegador en `lib/supabase/client.ts` (`createBrowserClient`) y cliente de servidor en `lib/supabase/server.ts` (`createServerClient` con `cookies()` de `next/headers`).
- Tipos en `lib/supabase/database.types.ts`, generados con el MCP `generate_typescript_types`. Quedan casi vacíos porque aún no hay tablas. Ambos clientes usan el genérico `<Database>`.
- Carpeta `supabase/migrations/` creada y versionada (con `.gitkeep`). Convención para los specs futuros: aplicar con el MCP `apply_migration` y guardar una copia del SQL en esa carpeta.
- Verificación de la conexión con una comprobación temporal en servidor que se elimina al terminar. No deja ninguna ruta pública.
- Revisar con `get_advisors` que el proyecto no tenga avisos de seguridad críticos al arrancar.

**No incluido (fuera de alcance de este spec):**

- Supabase Auth: reemplazar la sesión `av_user` de localStorage (`lib/session.ts`) va en otro spec.
- `proxy.ts` (Next 16) de refresco de sesión; llega con el spec de Auth.
- Crear tablas (`profiles`, `games`, `scores`), RLS y migrar `av_scores`, el catálogo de `lib/data.ts` o el Salón de la Fama.
- `service_role` key o cualquier clave secreta de Supabase.
- Ruta de health permanente, Edge Functions, Storage, Realtime y branching.
- Supabase CLI local o Docker.
- Entornos separados dev/prod.
- Cambios visuales o de comportamiento en cualquier pantalla existente.
- Pruebas automatizadas (no hay test runner).

## Modelo de datos

Sin tablas ni persistencia nuevas. Solo archivos de infraestructura y variables de entorno:

```
lib/supabase/client.ts          // createClient() para Client Components
lib/supabase/server.ts          // createClient() async para Server Components / Actions
lib/supabase/database.types.ts  // tipo Database generado
supabase/migrations/.gitkeep
```

Variables de entorno:

```
NEXT_PUBLIC_SUPABASE_URL=https://zhxfzcjwvakzvydurxke.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

Convenciones:

- La publishable key es pública por diseño. La protección de datos vendrá de RLS en los specs con tablas.
- `.env.example` lleva los nombres de las variables con valores vacíos o de ejemplo, nunca reales.
- `SUPABASE_PASSWORD` ya existe en `.env.local`. No se usa en este spec y nunca lleva prefijo `NEXT_PUBLIC_`.

## Plan de implementación

1. **Dependencias y guía** — `npm install @supabase/supabase-js @supabase/ssr`. Leer en `node_modules/next/dist/docs/` la guía de `cookies()` y de `proxy` de Next 16 antes de escribir los clientes. Consultar la guía de SSR de Next.js con el MCP `search_docs`.
2. **Entorno** — obtener URL y publishable key con el MCP, escribirlas en `.env.local` y agregar los nombres a `.env.example`. Verificar que `.env.local` sigue ignorado por git.
3. **`lib/supabase/client.ts`** — `createBrowserClient<Database>(url, key)`. Si falta una variable, lanza un error claro.
4. **`lib/supabase/server.ts`** — `createServerClient<Database>` con `getAll`/`setAll` sobre `await cookies()`. El `setAll` captura el error cuando se llama desde un Server Component, porque no puede escribir cookies.
5. **Tipos** — generar `lib/supabase/database.types.ts` con `generate_typescript_types` y tipar ambos clientes con `Database`.
6. **Carpeta de migraciones** — crear `supabase/migrations/.gitkeep` y dejar la convención documentada en este spec.
7. **Verificación de conexión (temporal)** — una ruta o script provisional que use el cliente de servidor para llamar a `supabase.auth.getSession()` o a una consulta que no requiera tablas, y confirmar que responde sin error. Verificar también que el cliente de navegador se importa en un Client Component sin romper el build. Eliminar la comprobación al terminar.
8. **Cierre** — correr `get_advisors` (seguridad), `npm run lint` y `npm run build`.

## Criterios de aceptación

- [x] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr`.
- [x] `.env.local` define `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con los valores del proyecto `zhxfzcjwvakzvydurxke`.
- [x] `.env.example` lista ambas variables sin valores reales y `.env.local` no está versionado.
- [x] `lib/supabase/client.ts` y `lib/supabase/server.ts` existen y exportan `createClient`, tipado con `Database`.
- [x] `lib/supabase/database.types.ts` existe y fue generado con el MCP de Supabase.
- [x] `supabase/migrations/` existe y está versionada con `.gitkeep`.
- [x] La comprobación temporal con el cliente de servidor devuelve respuesta sin error de red ni de credenciales.
- [x] Tras la verificación no queda ninguna ruta, script o archivo de prueba en el repo.
- [x] No existe `proxy.ts` ni código que use Supabase Auth.
- [x] No hay ninguna clave `service_role` ni el valor de `SUPABASE_PASSWORD` en el código ni en variables `NEXT_PUBLIC_`.
- [x] `get_advisors` (seguridad) no reporta problemas críticos.
- [x] Ninguna pantalla existente cambia su comportamiento ni su aspecto.
- [x] `npm run lint` y `npm run build` pasan sin errores.

## Decisiones tomadas y descartadas

- **Sí:** spec solo de infraestructura — integrar Supabase completo toca infra, auth y datos. Se divide en specs separados para mantener cada uno verificable.
- **No:** migrar auth y puntuaciones en este spec — son decisiones de dominio distintas (proveedores, RLS, esquema) y merecen su propio spec.
- **Sí:** `@supabase/ssr` con clientes separados de navegador y servidor — es el patrón soportado para App Router y evita compartir un cliente entre contextos.
- **No:** solo `@supabase/supabase-js` — no maneja cookies de sesión en SSR y obligaría a rehacer los clientes en el spec de Auth.
- **Sí:** nombre `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — alineado con las claves publishable actuales de Supabase.
- **No:** `proxy.ts` ahora — sin sesión no hay nada que refrescar. Evita tocar el enrutado de las rutas existentes sin beneficio.
- **Sí:** tablas fuera de este spec — cada tabla llega junto con la pantalla que la usa, con su RLS.
- **Sí:** migraciones vía MCP `apply_migration` con copia del SQL en `supabase/migrations/` — el historial queda en git sin requerir CLI ni Docker.
- **No:** Supabase CLI local — añade dependencias de entorno (Docker) que el proyecto no necesita todavía.
- **Sí:** un único proyecto Supabase para dev y prod por ahora — simple. Se revisa cuando haya datos reales de usuarios.
- **Sí:** verificación con comprobación temporal — confirma la conexión real sin dejar un endpoint público.
- **No:** `/api/health` permanente — expondría un endpoint sin un caso de uso concreto.
- **Sí:** tipos generados desde el MCP y clientes tipados desde el inicio — cada spec con tablas solo regenera el archivo.

## Riesgos identificados

| Riesgo                                                                       | Mitigación                                                                                                             |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Confundir la publishable key con una clave secreta, o exponer `service_role` | Solo se usa la publishable key. No se agrega `service_role`. La seguridad real depende de RLS en los specs con tablas. |
| Un solo proyecto para dev y prod: pruebas futuras pueden tocar datos reales  | Aceptado por ahora. Revisar la separación de entornos antes de tener usuarios reales.                                  |
| `cookies()` y `proxy` en Next 16 pueden diferir de lo conocido               | Leer las guías en `node_modules/next/dist/docs/` antes del paso 4.                                                     |
| `setAll` falla al llamarse desde Server Components                           | Envolver en `try/catch` y documentar que el refresco de cookies lo hará `proxy.ts` en el spec de Auth.                 |
| Comprobación temporal olvidada en el repo                                    | Criterio de aceptación explícito y revisión de `git status` antes de cerrar.                                           |
| Cliente creado con variables faltantes y error críptico                      | Error explícito en `client.ts` y `server.ts` cuando falta alguna variable.                                             |

## Qué **no** está en este spec

- Supabase Auth y `proxy.ts`.
- Tablas, RLS y migración de `av_scores`, el catálogo de juegos o el Salón de la Fama.
- `service_role`, Edge Functions, Storage, Realtime.
- Endpoint de health permanente y entornos dev/prod separados.
- Supabase CLI local, Docker y pruebas automatizadas.
