# 13 — Medidas de seguridad básicas

- **Estado:** Implementado
- **Depende de:** SPEC 06, SPEC 12
- **Fecha:** 2026-10-18

**Objetivo:** Cerrar el checklist de `references/security/security-checklist.md` (RLS, contraseñas, rate limit de signup, headers HTTP) y dejar `get_advisors` de seguridad sin avisos evitables.

## Por qué existe este spec

El advisor de Supabase marca 3 avisos y Next no envía cabeceras de seguridad. Spec 12 configuró Auth pero no endureció rate limits ni contraseñas filtradas.

## Alcance

**Incluido:**

1. **RLS**: verificar (no cambiar) que `games`, `scores` y `profiles` tienen RLS y sus policies de spec 06/12.
2. **`rls_auto_enable()`**: migración nueva que revoca `EXECUTE` a `public`, `anon`, `authenticated`. El event trigger `ensure_rls` sigue activando RLS en tablas nuevas de `public`.
3. **Contraseña mínima 8**: verificar en dashboard (Auth → Providers → Email) y en `app/auth/actions.ts` (ya existe por spec 12).
4. **Complejidad de contraseña**: debe tener minúsculas, mayúsculas, dígitos y símbolos (además de ≥ 8). Dos capas: (a) dashboard Auth → Providers → Email → Password requirements = "Lowercase, uppercase letters, digits and symbols"; (b) validación en `app/auth/actions.ts` (`signUp` y `updatePassword`) con error de campo en español que lista lo que falta, antes de llamar a Supabase. Pista visible bajo el campo contraseña en `/auth` (registro) y `/auth/nueva-clave`. Login no valida complejidad (cuentas existentes).
5. **Leaked password protection**: activar en dashboard (Auth → Providers → Email → Prevent use of leaked passwords). Si el plan es Free y no lo permite, queda documentado como riesgo aceptado.
6. **Max signup rate**: Auth → Rate Limits, límite de sign-ups/sign-ins por IP (valor propuesto: 30 / 5 min). Solo dashboard.
7. **Headers HTTP** en `next.config.ts` (`headers()` con `source: "/(.*)"`):
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)`
8. **Docs**: `CLAUDE.md` (config manual de dashboard ampliada + headers) y marcar el checklist.

**No incluido:**

- Content-Security-Policy (nonces / inline scripts de Next, OAuth) → spec propio.
- Rate limit de `submitScore` / scores anónimos → spec propio.
- Captcha (Turnstile/hCaptcha), 2FA.
- Cambios en policies RLS existentes.
- Pruebas automatizadas.

## Modelo de datos

Sin tablas ni tipos nuevos. Migración `supabase/migrations/20261018140000_security_hardening.sql`:

```sql
-- SPEC 13: rls_auto_enable() solo la invoca el event trigger ensure_rls
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
```

`database.types.ts` no cambia (la función devuelve `event_trigger`, no aparece en RPC tipadas).

## Plan de implementación

1. **Verificación previa**: `execute_sql` read-only de RLS en las 3 tablas y policies; `get_advisors security` (esperado: 3 avisos).
2. **Migración** `20261018140000_security_hardening.sql` con `apply_migration`; comprobar `has_function_privilege('anon', 'public.rls_auto_enable()', 'execute') = false` y que `ensure_rls` sigue habilitado.
3. **Headers**: leer `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md`; añadir `securityHeaders` + `headers()` en `next.config.ts` manteniendo `allowedDevOrigins`.
4. **Complejidad de contraseña en código**: helper de validación (minúscula, mayúscula, dígito, símbolo, ≥ 8) reutilizado por `signUp` y `updatePassword` en `app/auth/actions.ts`; pista en la UI de `/auth` y `/auth/nueva-clave`. Diseño con `/frontend-design`, manteniendo `field`.
5. **Dashboard (manual, lo hace el usuario)**: mínimo 8 (verificar), Password requirements = lowercase, uppercase, digits and symbols, leaked password protection, rate limits de signup/sign-in por IP.
6. **Docs**: `CLAUDE.md` sección Auth → "Dashboard config" con leaked pwd + rate limit; mención de headers en Stack notes; marcar `[x]` en `references/security/security-checklist.md`.

## Criterios de aceptación

- [ ] `games`, `scores`, `profiles` con `relrowsecurity = true`.
- [ ] `has_function_privilege('anon', 'public.rls_auto_enable()', 'execute')` y el de `authenticated` devuelven `false`.
- [ ] `ensure_rls` aparece con `evtenabled = 'O'` y crear una tabla de prueba en `public` (y borrarla) sigue activando RLS automáticamente.
- [ ] `get_advisors security` sin los avisos 0028/0029; `auth_leaked_password_protection` desaparece o queda documentado (plan Free).
- [ ] Registro con contraseña de 7 caracteres falla (action y Supabase).
- [ ] Registro y nueva clave rechazan contraseñas sin minúscula, mayúscula, dígito o símbolo, con error de campo que indica qué falta; `Abcdef1!` se acepta.
- [ ] Dashboard tiene Password requirements = lowercase, uppercase, digits and symbols.
- [ ] Dashboard muestra rate limit de sign-ups por IP configurado.
- [ ] `curl -I http://localhost:3000/` (y `/juegos/asteroides/jugar`) devuelve los 5 headers.
- [ ] Pantalla completa del gamepad sigue funcionando en móvil (390×844) con `fullscreen=(self)`.
- [ ] Login OAuth Google/GitHub y recuperación de contraseña siguen funcionando con `Referrer-Policy` y `X-Frame-Options`.
- [ ] `npm run lint` y `npm run build` pasan.

## Decisiones tomadas y descartadas

- **Sí:** revocar `EXECUTE` — quita los 2 avisos y conserva el auto-RLS.
- **No:** borrar `ensure_rls` — se pierde una red de seguridad útil.
- **No:** mover a schema privado — mismo resultado con más cambio.
- **Sí:** HSTS + Permissions-Policy además del checklist — bajo riesgo, más cobertura.
- **No:** CSP aquí — alto riesgo de romper Next/OAuth; merece spec propio.
- **Sí:** rate limit solo en Supabase — sin código ni dependencias nuevas.
- **No:** rate limit de scores ni captcha — otros dominios.
- **Sí:** complejidad en dashboard y en la action — la action da mensajes en español y evita la llamada; el dashboard cubre cualquier otro cliente.
- **No:** exigir complejidad en login — bloquearía cuentas ya creadas.
- **Sí:** leaked password protection en dashboard; si Free, riesgo aceptado — sin llamada propia a HIBP.

## Riesgos identificados

| Riesgo                                                         | Mitigación                                                           |
| -------------------------------------------------------------- | -------------------------------------------------------------------- |
| Leaked password protection requiere plan Pro                   | Documentar aviso como aceptado; revisitar al subir de plan.          |
| HSTS en dominio sin HTTPS completo                             | Sin `preload`; navegadores lo ignoran en `http://localhost`.         |
| `fullscreen=(self)` rompe pantalla completa en algún navegador | Verificar en móvil emulado; quitar la directiva si falla.            |
| Rate limit demasiado bajo bloquea pruebas manuales             | Valor 30 / 5 min; ajustable en dashboard.                            |
| `ensure_rls` deja de funcionar tras el revoke                  | Los triggers no comprueban EXECUTE al disparar; verificar en paso 2. |

## Qué **no** está en este spec

- CSP, rate limit de scores, captcha, 2FA.
