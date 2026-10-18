# 12 — Autenticación real con Supabase Auth

- **Estado:** Aprobado
- **Depende de:** SPEC 04, SPEC 06
- **Fecha:** 2026-10-18

**Objetivo:** Sustituir la sesión simulada de `/auth` por Supabase Auth (email + contraseña, Google y GitHub) con perfil `username`, recuperación de contraseña y menú de usuario, sin cambiar cómo se guardan las puntuaciones.

## Por qué existe este spec

Specs 04 y 06 aplazaron Auth y `proxy.ts`. `/auth` acepta cualquier cosa y escribe `av_user` en localStorage. Este spec da identidad real; ligar puntuaciones a usuarios va después.

## Alcance

**Incluido:**

1. **Registro email** (pestaña CREAR CUENTA): username, email, contraseña. Sin confirmación de email (se desactiva "Confirm email" en Supabase): al registrarse entra directo y va a `/`.
2. **Login email** (pestaña INICIAR SESIÓN): email + contraseña. El campo "Usuario" solo aparece al crear cuenta.
3. **OAuth Google y GitHub**: los botones existentes pasan a funcionar. Server Action `signInWithOAuth` → redirección al proveedor → route handler `app/auth/callback/route.ts` (`exchangeCodeForSession`) → `/`.
4. **Perfil** `public.profiles` creado por trigger en `auth.users`. Username de email = el del formulario; de OAuth = autogenerado (ver Modelo de datos).
5. **Recuperar contraseña**: enlace "¿OLVIDASTE TU CONTRASEÑA?" → formulario de email → `resetPasswordForEmail` con `redirectTo` a `/auth/callback?next=/auth/nueva-clave` → página `app/auth/nueva-clave/page.tsx` con `updateUser({ password })`. Mensaje genérico ("si existe la cuenta, recibirás un correo") para no revelar cuentas.
6. **SMTP**: Resend como SMTP custom de Supabase Auth (config manual en dashboard, `smtp.resend.com`).
7. **Mostrar/ocultar contraseña**: toggle en los campos contraseña (login, registro, nueva clave).
8. **Menú de usuario en nav**: `USERNAME ▾` abre dropdown con "CERRAR SESIÓN" (hoy cierra al clicar). En el panel móvil, "Cuenta" se sustituye por username + "Cerrar sesión".
9. **`proxy.ts`** en la raíz: refresca la sesión (patrón `@supabase/ssr` + `getUser()`). Ninguna ruta exige sesión; modo invitado se mantiene. `/auth` (y subrutas salvo `callback` y `nueva-clave`) redirige a `/` si hay sesión.
10. **`lib/session.ts` reescrito** sobre Supabase: misma API `useUser(): User | null` (`User = { name: string }`) para que `Nav` y `GamePlayer` no cambien de forma. Fuente: `onAuthStateChange` + `profiles.username`. Al cargar, borra `av_user` de localStorage. `setUser` desaparece (logout = Server Action).
11. **Estados UX**: botón con estado pendiente ("CONECTANDO…"), errores por campo y error general en español (credenciales inválidas, email/username ya usado, contraseña corta, proveedor cancelado → `/auth?error=oauth`).
12. Diseño con `/frontend-design` manteniendo `auth-card`, `auth-tabs`, `field`, `btn` existentes.

**No incluido:**

- Ligar `scores` a `user_id`, "TU MEJOR MARCA", rate limit de scores. `submitScore` sigue anónimo; solo se prellenan iniciales desde el username (como hoy).
- Confirmación de email, magic link, 2FA, otros proveedores.
- Página de perfil/cuenta, cambiar username, avatar, borrar cuenta.
- Pantalla "elige tu username" tras OAuth.
- Rutas protegidas.
- Pruebas automatizadas.

## Modelo de datos

Migración nueva `supabase/migrations/20261018120000_auth_profiles.sql`:

```sql
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null check (username ~ '^[A-Za-z0-9_]{3,12}$'),
  created_at  timestamptz not null default now()
);
create unique index profiles_username_lower_idx on public.profiles (lower(username));
-- RLS: select público (anon, authenticated); sin insert/update/delete desde clientes.
-- Trigger handle_new_user() (security definer, search_path = '') after insert on auth.users.
```

- **Username email**: `raw_user_meta_data->>'username'` (enviado en `signUp({ options: { data: { username } } })`). Validado antes en la Server Action (formato + unicidad con `lower()`).
- **Username OAuth**: base = `user_name` (GitHub) → `name` → parte local del email; normalizado a `[A-Za-z0-9_]`, recortado a 12, relleno a 3 con `_`; si choca, se recorta y se añade sufijo numérico (`kai_2`). El trigger nunca falla por colisión.
- Visualización: username en mayúsculas en nav. Unicidad case-insensitive.
- Contraseña: mínimo 8 (validado en action; Supabase "Minimum password length" a 8).
- `lib/supabase/database.types.ts` se regenera con `generate_typescript_types`.
- Tipos de estado de formulario (`useActionState`), en `app/auth/actions.ts`:

```ts
type AuthState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"username" | "email" | "password", string>>;
};
```

Sin variables de entorno nuevas: la URL de retorno OAuth/reset se construye con el header `origin` de la petición. URLs permitidas (`http://localhost:3000/**` + producción) se registran en Supabase Auth → URL Configuration.

## Plan de implementación

1. **Requisitos manuales (documentar, no código)**: en Supabase desactivar "Confirm email", mínimo 8, Site URL + Redirect URLs; activar Google y GitHub con sus client id/secret (apps OAuth con callback `https://<proyecto>.supabase.co/auth/v1/callback`); SMTP custom Resend. Leer `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` y `03-api-reference/03-file-conventions/proxy.md`, y la guía SSR de Supabase vía `search_docs`.
2. **Migración `profiles` + trigger** con `apply_migration`; comprobar con `get_advisors`; regenerar `database.types.ts`.
3. **`proxy.ts`** de refresco de sesión + redirección de `/auth` con sesión. Actualizar comentario de `setAll` en `lib/supabase/server.ts`.
4. **`app/auth/actions.ts`**: `signUp`, `signIn`, `signOut`, `signInWithOAuth(provider)`, `requestPasswordReset`, `updatePassword`. Validación en servidor, mensajes en español.
5. **`app/auth/callback/route.ts`**: `exchangeCodeForSession`, `next` solo rutas internas (empieza por `/`, no `//`), error → `/auth?error=oauth`.
6. **`lib/session.ts`** reescrito (cliente Supabase + `onAuthStateChange` + lectura de `profiles`, caché estable para `useSyncExternalStore`, limpieza de `av_user`).
7. **UI `/auth`**: `app/auth/page.tsx` pasa a usar las actions con `useActionState`; vista "recuperar contraseña" en la misma tarjeta; toggle de visibilidad; errores y pendientes. Nueva `app/auth/nueva-clave/page.tsx`.
8. **Nav**: dropdown de usuario (cierre con clic fuera/Escape) + panel móvil; logout vía action y `router.refresh()`.
9. **Docs**: `CLAUDE.md` (tabla de rutas: `/auth` deja de ser simulado; `proxy.ts`; `profiles`), `.env.example` sin cambios salvo nota de config de dashboard si aplica.

## Criterios de aceptación

- [ ] Registro con username/email/contraseña válidos crea fila en `auth.users` y `profiles`, deja sesión iniciada y la nav muestra el username en mayúsculas.
- [ ] Registro con username ya existente (otra capitalización) muestra error en el campo y no crea usuario.
- [ ] Contraseña de menos de 8 caracteres muestra error y no llama a Supabase.
- [ ] Login con contraseña incorrecta muestra "Credenciales inválidas" sin revelar si el email existe.
- [ ] Login con Google y con GitHub vuelve a `/` con sesión y username autogenerado válido (`^[A-Za-z0-9_]{3,12}$`).
- [ ] Dos usuarios OAuth con la misma base obtienen usernames distintos.
- [ ] Cancelar OAuth en el proveedor deja en `/auth` con mensaje de error.
- [ ] "¿Olvidaste tu contraseña?" envía email (vía Resend); el enlace abre `/auth/nueva-clave` y permite fijar contraseña nueva con la que luego se entra.
- [ ] Recarga de página mantiene la sesión (cookies, no localStorage); `av_user` ya no existe en localStorage.
- [ ] El dropdown de la nav cierra sesión; la nav vuelve a "Iniciar Sesión".
- [ ] Con sesión, visitar `/auth` redirige a `/`.
- [ ] Sin sesión, todas las rutas siguen accesibles y "Jugar como invitado" funciona; guardar puntuación sigue funcionando igual.
- [ ] El modal de game over prellena iniciales desde el username.
- [ ] El toggle muestra/oculta la contraseña.
- [ ] `profiles` tiene RLS: un `insert`/`update` con la clave publishable falla.
- [ ] `get_advisors` sin avisos de seguridad nuevos; `npm run lint` y `npm run build` pasan.
- [ ] Verificado en móvil (390×844) que tarjeta y dropdown se ven bien.

## Decisiones tomadas y descartadas

- **Sí:** email + Google + GitHub en un spec — los botones ya existen en la UI.
- **No:** magic link — añade dependencia total del email.
- **Sí:** sin confirmación de email — evita fricción y SMTP en el registro.
- **Sí:** login por email, no por username — nativo de Supabase y no expone qué usernames existen vía login.
- **Sí:** tabla `profiles` con trigger — username único y consultable; base para ligar scores después.
- **No:** solo `user_metadata` — no garantiza unicidad.
- **Sí:** username OAuth autogenerado — sin pantalla extra.
- **No:** pantalla "elige username" — más rutas y estados; posible spec futuro de cuenta.
- **Sí:** Server Actions con `useActionState` — mismo patrón que `sendContact`, validación en servidor.
- **No:** auth solo en cliente — validación saltable.
- **Sí:** reescribir `lib/session.ts` con la misma API `useUser()` — `Nav`/`GamePlayer` casi intactos.
- **Sí:** ninguna ruta protegida — mantiene modo invitado y scores anónimos (spec 06).
- **No:** ligar scores a usuarios aquí — otro dominio (RLS, leaderboard, "TU MEJOR MARCA").
- **Sí:** Resend como SMTP — ya integrado; el SMTP por defecto de Supabase limita a ~2 emails/h.
- **Sí:** `origin` de la petición para URLs de retorno — sin env var nueva.

## Riesgos identificados

| Riesgo                                                                              | Mitigación                                                                      |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Remitente sandbox `onboarding@resend.dev` solo entrega al dueño de la cuenta Resend | Aceptado para desarrollo; verificar dominio en Resend antes de producción.      |
| Callback OAuth / redirect mal configurado en Supabase o proveedor                   | Paso 1 lista las URLs exactas; error → `/auth?error=oauth`.                     |
| Trigger falla y bloquea el alta en `auth.users`                                     | Generación de username nunca lanza (sufijo en colisión); probar con duplicados. |
| Open redirect vía `next` en `/auth/callback`                                        | Solo rutas internas (`/` y no `//`).                                            |
| `proxy` de Next 16 difiere de lo conocido                                           | Leer docs locales antes del paso 3.                                             |
| Parpadeo de nav (SSR sin usuario → cliente con usuario)                             | Aceptado; snapshot de servidor `null` como hoy.                                 |

## Qué **no** está en este spec

- Puntuaciones ligadas a usuarios, "TU MEJOR MARCA", rate limit.
- Confirmación de email, magic link, 2FA, más proveedores.
- Página de cuenta, cambio de username, avatar, borrar cuenta.
- Rutas protegidas.
