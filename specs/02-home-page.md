# 02 — Home Page (landing) de Arcade Vault

- **Estado:** Aprovado
- **Depende de:** SPEC 01
- **Fecha:** 2026-09-29

**Objetivo:** Implementar la landing page en `/` portando `references/templates/home-about/home.jsx`, y mover la Biblioteca actual a `/biblioteca`.

## Alcance

**Incluido:**

- Nueva ruta `/` (`app/page.tsx`) con las secciones del prototipo `home.jsx`: hero con siluetas flotantes, "¿Por qué Arcade Vault?" (4 feature cards), "Juegos disponibles ahora" (rail de 6 `MiniCard`), banda de stats, "Actividad en vivo" (últimas puntuaciones + top jugadores hoy), "Precios" (plan único + FAQ) y CTA final.
- Mover la Biblioteca actual (`app/page.tsx`) a `app/biblioteca/page.tsx` sin cambiar su comportamiento.
- Actualizar `components/nav.tsx`: agregar link "Inicio" → `/`, "Biblioteca" → `/biblioteca`; el logo apunta a `/`. Activo de "Biblioteca" = `/biblioteca` + `/juegos/*`; activo de "Inicio" = solo `/`. Mismo cambio en el panel móvil.
- Actualizar referencias a la vieja Biblioteca en `/`: "VOLVER AL VAULT" (`app/juegos/[id]/page.tsx`), botón de salir en `app/juegos/[id]/jugar/page.tsx`, link en `app/salon/page.tsx`.
- Los redirects tras login/invitado en `app/auth/page.tsx` siguen yendo a `/` (ahora el Home).
- Animación "reveal" al hacer scroll con `IntersectionObserver` (hook `useReveal`), portada desde `home.jsx`.
- Portar a `app/globals.css` los estilos del Home desde `references/templates/home-about/styles.css`: bloques `HOME PAGE`, `ACTIVITY` y `PRICING`, más las utilidades que usen (`.reveal`, `.fade-in`, `.blink`, `.pulse`) si aún no existen.
- Datos hardcodeados del Home (últimas puntuaciones, top jugadores, features, stats, FAQ) en `lib/home-data.ts`; `MiniCard` usa `GAMES.slice(0, 6)`.
- Botones del Home navegan con `next/link`: "EXPLORAR JUEGOS"/"VER TODOS"/"INSERTAR MONEDA" → `/biblioteca`; "CREAR CUENTA"/"EMPEZAR GRATIS" → `/auth`; `MiniCard` → `/juegos/[id]`; "VER SALÓN" → `/salon`.
- Fidelidad visual con `references/templates/home-about/arcade-vault-standalone.html` (desktop y móvil).

**No incluido (fuera de alcance de este spec):**

- Página "Acerca de" y formulario de contacto (`about.jsx`) — otro spec. El Nav **no** agrega el link "Acerca de" todavía.
- Datos "en vivo" reales: las puntuaciones recientes y el top de hoy son literales, no salen de `av_scores` ni `seededScores`.
- Backend, pagos o planes reales — la sección de precios es solo contenido estático.
- Cambios al contador decorativo de "Créditos" ni a la lógica de sesión.
- Metadata/SEO adicional.
- Pruebas automatizadas (no hay test runner).

## Modelo de datos

Sin estructuras nuevas de estado ni persistencia. Solo constantes tipadas de contenido estático en **`lib/home-data.ts`**:

```ts
import type { Game } from "@/lib/data";

export type Tone = "cyan" | "magenta" | "yellow" | "green";

export type Feature = { icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET"; title: string; desc: string; tone: Tone };
export type HomeStat = { n: string; unit: string; sub: string };
export type RecentScore = { player: string; game: string; score: number; when: string; tone: Tone };
export type TopPlayer = { rank: number; player: string; score: number };
export type Faq = { q: string; a: string };

export const FEATURES: Feature[];       // 4 items, textos literales de home.jsx
export const HOME_STATS: HomeStat[];    // 3 items
export const RECENT_SCORES: RecentScore[]; // 7 items
export const TOP_PLAYERS: TopPlayer[];  // 5 items
export const PRICING_FEATURES: string[]; // 6 ítems de la lista con ✔
export const FAQS: Faq[];               // 3 items
```

Los puntajes se formatean con `toLocaleString("es-ES")`, igual que el prototipo. Los `Game` se reutilizan de `lib/data.ts` sin cambios.

## Plan de implementación

1. **Mover la Biblioteca** — crear `app/biblioteca/page.tsx` con el contenido actual de `app/page.tsx` (sin cambios de lógica) y dejar `app/page.tsx` temporalmente redirigiendo/renderizando un placeholder mínimo. Verificar que `/biblioteca` funciona.
2. **Actualizar links** — `components/nav.tsx` (Inicio, Biblioteca, logo, activo, panel móvil), `app/juegos/[id]/page.tsx`, `app/juegos/[id]/jugar/page.tsx`, `app/salon/page.tsx` para apuntar a `/biblioteca` donde antes iba `/` como Biblioteca.
3. **`lib/home-data.ts`** — tipos y constantes del Home portadas literalmente de `home.jsx`.
4. **CSS del Home** — copiar a `app/globals.css` los bloques `HOME PAGE`, `ACTIVITY`, `PRICING` y utilidades faltantes desde `home-about/styles.css`; no duplicar reglas ya existentes.
5. **`components/floating-silhouettes.tsx`** y **`components/feature-icon.tsx`** — SVGs pixel portados de `FloatingSilhouettes` y `FeatureIcon`.
6. **`components/mini-card.tsx`** y **`hooks/use-reveal.ts`** (o `lib/use-reveal.ts`) — `MiniCard` como `Link` a `/juegos/[id]`; hook `useReveal` con `IntersectionObserver`.
7. **`app/page.tsx`** — client component (por `useReveal`) con las secciones: hero, por qué, juegos disponibles, stats, actividad en vivo, precios, CTA final, usando `next/link` para los botones.
8. **Verificación manual** — recorrer `/` y `/biblioteca` en `npm run dev`, comparar con `arcade-vault-standalone.html` (desktop y móvil), probar cada CTA/link y correr `npm run lint` + `npm run build`.

## Criterios de aceptación

- [ ] `/` renderiza sin errores el Home con las 7 secciones (hero, por qué, juegos, stats, actividad, precios, CTA final) dentro del layout con `Nav` y footer.
- [ ] `/biblioteca` muestra la Biblioteca con búsqueda y filtro por categoría, idéntica a la anterior `/`.
- [ ] El Nav muestra "Inicio" y "Biblioteca" (escritorio y panel móvil); "Inicio" está activo solo en `/`; "Biblioteca" está activo en `/biblioteca` y `/juegos/*`.
- [ ] El Nav no muestra link "Acerca de" y `/acerca-de` no existe.
- [ ] Los botones "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS" e "INSERTAR MONEDA" navegan a `/biblioteca`.
- [ ] Los botones "CREAR CUENTA" y "EMPEZAR GRATIS" navegan a `/auth`; "VER SALÓN →" navega a `/salon`.
- [ ] El rail muestra exactamente 6 juegos (`GAMES.slice(0, 6)`) y cada `MiniCard` navega a `/juegos/[id]` correspondiente.
- [ ] Las 4 feature cards, 3 stats, 7 puntuaciones recientes, 5 top jugadores, la lista de 6 ítems del plan y las 3 FAQs coinciden con los textos de `home.jsx`.
- [ ] Las secciones con clase `reveal` aparecen (clase `in`) al entrar en el viewport al hacer scroll.
- [ ] "VOLVER AL VAULT" (detalle), el botón de salir del reproductor y el link del salón llevan a `/biblioteca`.
- [ ] Iniciar sesión o entrar como invitado en `/auth` redirige a `/` (Home).
- [ ] El diseño (colores, tipografías, glow, siluetas flotantes, responsive móvil) coincide con `arcade-vault-standalone.html`.
- [ ] `npm run lint` y `npm run build` pasan sin errores.

## Decisiones tomadas y descartadas

- **Sí:** Home en `/`, Biblioteca en `/biblioteca` — el prototipo trata "Inicio" y "Biblioteca" como pantallas distintas y una landing debe ser la raíz.
- **No:** Biblioteca en `/juegos` — ya existe `/juegos/[id]` y `/biblioteca` coincide con el nombre del nav y del prototipo.
- **Sí:** solo Home en este spec — About + Contacto incluye un formulario con estado propio y merece su propio spec.
- **Sí:** datos de actividad/top hardcodeados en `lib/home-data.ts` — fiel al prototipo y coherente con los mocks de SPEC 01; evita lógica extra sobre `av_scores`.
- **No:** derivar "actividad en vivo" de `av_scores`/`seededScores` — divergiría del prototipo y no aporta hasta tener backend.
- **Sí:** `next/link` en lugar del `navigate()` del prototipo, igual que en SPEC 01.
- **Sí:** CSS del Home en `app/globals.css` (Tailwind v4, sin archivo de config) — mismo lugar donde ya vive el sistema de diseño.
- **Sí:** `app/page.tsx` como client component por `useReveal`; alternativa de extraer solo el hook a un componente cliente pequeño queda a criterio de implementación si no cambia el resultado visual.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Links a `/` como Biblioteca olvidados tras el movimiento de ruta | Paso 2 del plan los enumera; criterio de aceptación explícito; buscar con `grep` `"/"` y `router.push` antes de cerrar. |
| Duplicar o chocar reglas CSS al copiar de `styles.css` | Copiar solo los bloques `HOME PAGE`, `ACTIVITY`, `PRICING` y utilidades faltantes; revisar clases ya existentes en `globals.css`. |
| `IntersectionObserver` no disponible en SSR o con `.reveal` invisible sin JS | El hook corre solo en `useEffect` (cliente); verificar que las secciones no queden ocultas tras hidratar. |

## Qué **no** está en este spec

- Página "Acerca de" y formulario de contacto (otro spec).
- Link "Acerca de" en el Nav.
- Datos en vivo, backend, pagos o autenticación real.
- Pruebas automatizadas y SEO adicional.
