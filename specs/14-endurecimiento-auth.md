# 14 — Endurecimiento de autenticación

- **Estado:** Borrador
- **Depende de:** SPEC 12, SPEC 13
- **Fecha:** 2026-11-02

**Objetivo:** Cerrar los hallazgos de la revisión de seguridad de login/registro/recuperación (origen de redirect, username, privilegios de BD, fingerprinting) y fijar reglas de auth para el plugin `security-guidance`.

## Por qué existe este spec

Se revisó auth con el plugin `security-guidance` (categorías: open redirect, host header injection, auth bypass, enumeración, secretos) y se cruzó con `references/security/audits/2026-10-18.md`. El plugin solo actúa por hooks (diff al terminar turno y en `git commit`), así que las sugerencias se recogen aquí y se implementan con `/spec-impl`; el plugin revisará esa implementación automáticamente.

Verificado OK y **sin cambios**: `safeNext` del callback, `getUser()` en proxy y `updatePassword`, validación servidor de username/email/contraseña, mensajes genéricos en login y reset, RLS de `profiles` (solo `select`), `handle_new_user` (`search_path=''`, sin `EXECUTE` público), `next` ya en `16.4.2`.

## Alcance

**Incluido:**

1. **APP-ORIGIN-01 — origen fijo.** `getOrigin()` en `app/auth/actions.ts` deja de leer `origin`/`x-forwarded-host`/`host` y devuelve la env `NEXT_PUBLIC_SITE_URL` (sin barra final). Si falta, lanza error (mismo patrón que las envs de Supabase). Se usa en `signInWithOAuth` y `requestPasswordReset`. Documentar en `.env.example` y `CLAUDE.md` (sustituye la frase "Return URLs use the request `origin` header (no env var)").
2. **APP-PWD-01 — cambio de clave con reauth.** Dashboard Supabase: Auth → Providers → Email → **Secure password change** activado. Sin cambios de código. Verificar que el flujo de recuperación (`/auth/nueva-clave`) sigue funcionando con ese ajuste; si no, documentar el efecto y decidir en revisión.
3. **APP-ENUM-01 — aceptar y documentar.** `signUp` sigue diciendo "Ese correo ya está registrado." (Confirm email off, sin alternativa limpia; mitigado por rate limit 30/5 min). Se registra como riesgo aceptado `ACC-ENUM-01` en `CLAUDE.md` (sección Auth).
4. **APP-RACE-01 — username sufijado.** Tras `signUp` con sesión, `signUp` lee `profiles.username` del usuario nuevo; si difiere (case-insensitive) del pedido, el trigger lo sufijó por colisión concurrente: se redirige a `/` igualmente y se muestra el aviso en el flujo (ver Plan, paso 4). El pre-chequeo `ilike` actual se mantiene.
5. **DB-PROF-01 — trigger sin email.** Migración nueva que redefine `handle_new_user()` sin el fallback `split_part(email, '@', 1)`: el último recurso pasa a `'user'` (+ sufijo si colisiona). Misma firma, `security definer`, `search_path=''`, `revoke execute` repetido.
6. **DB-GRANT-01 — privilegios mínimos.** Misma migración: `revoke insert, update, delete, truncate, references, trigger` de `anon`/`authenticated` sobre `profiles` y `games`; sobre `scores` `revoke` de todo salvo `select` y un `grant insert (game_id, name, score)` por columnas (cierra DB-SCORE-01: `created_at` no insertable por el cliente). Ver Riesgos.
7. **APP-HDR-01.** `poweredByHeader: false` en `next.config.ts`.
8. **PLUGIN-01 — reglas del plugin.** Crear `.claude/claude-security-guidance.md` (commiteado) con las invariantes de auth del proyecto (ver Modelo de datos).
9. **Docs.** `CLAUDE.md` (Auth: origen fijo, `ACC-ENUM-01`, Secure password change en Dashboard config; Data layer: grants mínimos) y `.env.example`.

**No incluido:**

- Captcha, 2FA, rate limit propio (ya aceptados: `ACC-CAP-01`).
- Leaked password protection (`ACC-LEAK-01`, plan Free).
- Content-Security-Policy (`ACC-CSP-01`).
- Rate limit / anti-cheat de `submitScore` y nombre de score no ligado al usuario (`ACC-SCORE-01`, `ACC-NAME-01`).
- Pantalla de cuenta con "clave actual" (no existe hoy; spec propio si se quiere).
- Rate limit de `sendContact` (`APP-CONTACT-01`) y reparar timestamps de migraciones (`DB-MIG-01`).
- Pruebas automatizadas.

## Modelo de datos

Sin tablas ni columnas nuevas. Cambios:

**Env nueva** (`.env.local`, documentada en `.env.example`; es pública por ser una URL, no un secreto):

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Migración** `supabase/migrations/20261102120000_auth_hardening.sql` (nueva; nunca editar migraciones aplicadas):

```sql
-- 1) handle_new_user(): create or replace sin fallback de email (último recurso 'user')
-- 2) revoke execute on function public.handle_new_user() from public, anon, authenticated;
-- 3) revoke insert, update, delete, truncate, references, trigger
--      on public.profiles, public.games from anon, authenticated;
-- 4) revoke insert, update, delete, truncate, references, trigger
--      on public.scores from anon, authenticated;
--    grant insert (game_id, name, score) on public.scores to anon, authenticated;
```

`database.types.ts` no cambia.

**`.claude/claude-security-guidance.md`** (reglas, una línea cada una):

- `next` de `/auth/callback` solo rutas internas (`safeNext`); nunca redirigir a URL externa.
- Decisiones de servidor usan `supabase.auth.getUser()`, nunca `getSession()`.
- `redirectTo` de OAuth/reset sale de `NEXT_PUBLIC_SITE_URL`, nunca de headers de la petición.
- Login y reset devuelven mensajes genéricos (no revelan si la cuenta existe); la excepción documentada es `signUp` (`ACC-ENUM-01`).
- Ningún secreto con prefijo `NEXT_PUBLIC_`; sin `service_role` en el repo.
- `profiles` no admite escrituras desde el cliente; solo el trigger `handle_new_user()`.
- Funciones `security definer` con `set search_path = ''` y `revoke execute` a `public/anon/authenticated`.
- Todo cambio de esquema va en migración nueva con RLS activado.

## Plan de implementación

1. **Verificación previa** (read-only vía MCP supabase): `has_table_privilege` de `anon`/`authenticated` sobre las 3 tablas; confirmar que `submitScore` inserta solo `game_id`, `name`, `score` (si inserta otra columna, ajustar el `grant`).
2. **Migración** `20261102120000_auth_hardening.sql` con `apply_migration`; comprobar privilegios y que un alta nueva sigue creando perfil.
3. **Origen fijo**: añadir `NEXT_PUBLIC_SITE_URL` a `.env.local` y `.env.example`; reescribir `getOrigin()` (lectura literal `process.env.NEXT_PUBLIC_SITE_URL`); retirar el import de `headers` si queda sin uso.
4. **Username sufijado**: en `signUp`, tras `data.session`, `select username` de `profiles` por `data.user.id`; si difiere, `redirect("/?aviso=username")` y mostrar el aviso en `HomeView`/`Nav` (diseño con `/frontend-design`, mensaje: "Tu usuario quedó como X porque el elegido se ocupó."). Sin diferencia: `redirect("/")`.
5. **`poweredByHeader: false`** en `next.config.ts` manteniendo `headers()` y `allowedDevOrigins`.
6. **Reglas del plugin**: crear `.claude/claude-security-guidance.md`.
7. **Dashboard (manual, usuario)**: Secure password change; `Site URL` y Redirect URLs sin comodines amplios; añadir `NEXT_PUBLIC_SITE_URL` en el hosting de producción.
8. **Docs**: `CLAUDE.md` y `.env.example`; anotar en `references/security/` el estado de los hallazgos cerrados.

## Criterios de aceptación

- [ ] `curl -X POST` a una Server Action de reset con `Host`/`Origin` falsos genera `redirectTo` con `NEXT_PUBLIC_SITE_URL` (revisar el email o el log de Auth).
- [ ] Sin `NEXT_PUBLIC_SITE_URL` el flujo de OAuth/reset falla con error explícito, no con host por defecto.
- [ ] Login Google/GitHub y recuperación de contraseña siguen completándose end-to-end (Playwright, `localhost:3000`).
- [ ] Con Secure password change activo, el flujo `/auth/nueva-clave` desde el email sigue funcionando.
- [ ] `has_table_privilege('anon', 'public.profiles', 'insert|update|delete|truncate')` = `false` para `anon` y `authenticated` en `profiles` y `games`.
- [ ] En `scores`: `anon`/`authenticated` solo tienen `select` y `insert` por columnas `(game_id, name, score)`; insertar `created_at` vía REST con la publishable key falla; `submitScore` sigue funcionando.
- [ ] `handle_new_user()` sin referencia a `email` (`pg_get_functiondef`); alta OAuth sin `user_name`/`name` crea username `user`/`user_2`, no la parte local del email.
- [ ] Forzar colisión (dos altas con el mismo username) muestra el aviso de username sufijado y el perfil existe.
- [ ] `curl -I http://localhost:3000/` no devuelve `X-Powered-By` y mantiene los 5 headers de spec 13.
- [ ] `.claude/claude-security-guidance.md` existe y está versionado.
- [ ] `get_advisors security` sin avisos nuevos.
- [ ] `npm run lint` y `npm run build` pasan.

## Decisiones tomadas y descartadas

- **Sí:** env `NEXT_PUBLIC_SITE_URL` — única fuente de verdad; elimina la dependencia de headers manipulables.
- **No:** allowlist en código — hay que tocar código al cambiar de dominio.
- **Sí:** aceptar enumeración en `signUp` — sin alternativa limpia con Confirm email off; mitigada por rate limit.
- **No:** mensaje genérico en `signUp` — rompe UX y el usuario no sabría qué corregir.
- **Sí:** Secure password change por dashboard — cero código, cubre sesión robada.
- **No:** clave actual en UI — no hay pantalla de cuenta; ampliaría alcance.
- **Sí:** avisar del username sufijado — evita que el usuario ignore que su nombre en el ranking cambió.
- **Sí:** grants por columnas en `scores` — cierra DB-SCORE-01 con el mismo cambio de privilegios.
- **Sí:** reglas propias del plugin — el revisor no puede inferir invariantes específicas del proyecto.

## Riesgos

| Riesgo                                                            | Mitigación                                                                                     |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` mal puesta en producción rompe OAuth/reset | Error explícito si falta; criterio de aceptación de end-to-end; documentado en `.env.example`. |
| Revocar grants rompe `submitScore` si inserta otra columna        | Paso 1 lo verifica antes de migrar; la migración se prueba con una puntuación real.            |
| Secure password change altera el flujo de recuperación            | Se prueba en el criterio de aceptación; si falla, queda documentado y se revisa.               |
| Trigger redefinido rompe altas                                    | `create or replace` con misma firma; se prueba alta por email y OAuth tras aplicar.            |

## Qué **no** entra en este spec

- Captcha, 2FA, CSP, rate limit de scores/contacto.
- Leaked password protection.
- Pantalla de cuenta o cambio de clave con clave actual.
- Renombrar timestamps de migraciones existentes.

Cada uno, si se aborda, va en su propio spec.
