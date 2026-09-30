# 03 — Página "Acerca de" y formulario de contacto con Resend

- **Estado:** Implementar
- **Depende de:** SPEC 01, SPEC 02
- **Fecha:** 2026-09-29

**Objetivo:** Implementar la página `/acerca-de` portando `references/templates/home-about/about.jsx` (sección Acerca de + formulario de contacto) y enviar el mensaje del formulario por correo con Resend mediante una Server Action.

## Alcance

**Incluido:**

- Nueva ruta `/acerca-de` (`app/acerca-de/page.tsx`) con la misma estructura y textos de `about.jsx`: hero "ACERCA DE ARCADE VAULT" con misión, fila de 3 `highlight` (HEART, BROWSER, PLANT), divisor de píxeles animado y sección "CONTÁCTANOS" con tips y formulario.
- Formulario con campos NOMBRE, CORREO ELECTRÓNICO y MENSAJE, botón "▶  ENVIAR MENSAJE", animación `shake` cuando hay errores de validación y estado de éxito estilo terminal "VAULT-OS // TERMINAL" con botón "ENVIAR OTRO MENSAJE" (mismos textos que el prototipo, incluyendo `GRACIAS, {NOMBRE}`).
- Envío real de correo con el SDK `resend` desde una Server Action (`app/acerca-de/actions.ts`, `"use server"`). El correo llega a `CONTACT_TO_EMAIL`, sale desde `RESEND_FROM` y usa `replyTo` = correo del visitante.
- Validación en servidor: nombre (1–80 caracteres), correo (formato válido, máx. 254), mensaje (1–2000 caracteres), todos con `trim()`. Campo honeypot oculto anti-bot: si viene relleno, la acción responde éxito sin enviar nada.
- Estado de error: si la validación del servidor falla o Resend devuelve error, se muestra un mensaje de error estilo terminal (línea `[ERROR] ...` en rojo/magenta) y se conservan los valores escritos. El estado de envío (pending) deshabilita el botón y cambia su texto a "ENVIANDO…".
- Validación de cliente equivalente al prototipo (campos vacíos → `shake` sin llamar al servidor).
- Variables de entorno: `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `RESEND_FROM` (por defecto sugerido `onboarding@resend.dev`), documentadas en un `.env.example` (el `.env*` real ya está en `.gitignore`; `.env.example` se agrega con excepción `!.env.example`).
- Nav (`components/nav.tsx`): agregar link "Acerca de" → `/acerca-de` en escritorio y panel móvil; activo solo en `/acerca-de`.
- Reutilizar `useReveal` (`hooks/use-reveal.ts`) para las secciones `.reveal`.
- Portar a `app/globals.css` los estilos del bloque `ABOUT PAGE` de `references/templates/home-about/styles.css` (`.about-*`, `.highlight*`, `.about-divider`, `.contact-*`, `.terminal-success`, `.term-*`, `@keyframes shake`, `.btn.press`), sin duplicar reglas existentes (`.field`, `.reveal`, `.fade-in`, `.blink`), más estilo nuevo para la línea de error de la terminal.
- Fidelidad visual con `references/templates/home-about/arcade-vault-standalone.html` (desktop y móvil).

**No incluido (fuera de alcance de este spec):**

- Rate limiting o captcha (requeriría almacenamiento externo; otro spec si hace falta).
- Guardar los mensajes en base de datos o mostrarlos en algún panel.
- Correo de confirmación/autorespuesta al visitante.
- Dominio propio verificado en Resend (se usa el remitente configurado en `RESEND_FROM`; con el sandbox `onboarding@resend.dev` solo se entrega al correo dueño de la cuenta Resend).
- Templates de correo con React Email; el cuerpo es texto/HTML simple.
- Metadata/SEO adicional de la página.
- Pruebas automatizadas (no hay test runner).

## Modelo de datos

Sin persistencia ni estado global nuevo. Solo tipos de la Server Action en **`app/acerca-de/actions.ts`**:

```ts
export type ContactFields = { name: string; email: string; msg: string };

export type ContactState =
  | { status: "idle" }
  | { status: "success"; name: string }
  | { status: "error"; message: string; fields: ContactFields };

export async function sendContact(prev: ContactState, formData: FormData): Promise<ContactState>;
```

Campos del `FormData`: `name`, `email`, `msg` y el honeypot `website` (oculto, debe llegar vacío).

Variables de entorno (solo servidor):

```
RESEND_API_KEY=re_xxx
CONTACT_TO_EMAIL=destino@ejemplo.com
RESEND_FROM=Arcade Vault <onboarding@resend.dev>
```

Si falta alguna variable, la acción devuelve `status: "error"` con un mensaje genérico (sin exponer detalles) y registra el detalle con `console.error`.

## Plan de implementación

1. **Dependencia y entorno** — `npm install resend`, crear `.env.example` con las 3 variables y ajustar `.gitignore` para permitirlo. Antes de escribir código, leer la guía de Server Actions en `node_modules/next/dist/docs/` (Next.js 16).
2. **CSS de About** — copiar el bloque `ABOUT PAGE` (y `shake`, `.btn.press`, terminal) a `app/globals.css`, más estilo de error de terminal; no duplicar reglas existentes.
3. **`components/highlight-icon.tsx`** — SVGs pixel de `HighlightIcon` (HEART, BROWSER, PLANT).
4. **`app/acerca-de/page.tsx` (solo contenido estático)** — hero, highlights y divisor con `useReveal`; formulario visual con estado local y el éxito simulado del prototipo para comprobar el diseño. Verificar `/acerca-de` en dev.
5. **Nav** — link "Acerca de" en escritorio y panel móvil con estado activo en `/acerca-de`.
6. **`app/acerca-de/actions.ts`** — `sendContact`: honeypot, validación, envío con Resend, mapeo de errores a `ContactState`.
7. **Conectar el formulario** — reemplazar el éxito simulado por `useActionState(sendContact, ...)`; estados pending, éxito (terminal) y error (terminal con `[ERROR]`), conservando valores; `shake` en validación de cliente y de servidor.
8. **Verificación manual** — con `.env.local` real, enviar un mensaje y confirmar la recepción; probar campos vacíos, correo inválido, honeypot, API key inválida y móvil; correr `npm run lint` y `npm run build`.

## Criterios de aceptación

- [ ] `/acerca-de` renderiza sin errores dentro del layout con `Nav` y footer.
- [ ] El Nav muestra "Acerca de" (escritorio y panel móvil) y solo está activo en `/acerca-de`.
- [ ] Los textos del hero, misión, 3 highlights, tips de contacto y etiquetas del formulario coinciden con `about.jsx`.
- [ ] Las secciones con clase `reveal` obtienen la clase `in` al entrar en el viewport.
- [ ] Enviar con algún campo vacío hace `shake` del formulario y no llama al servidor.
- [ ] Enviar datos válidos entrega un correo a `CONTACT_TO_EMAIL` con asunto que incluye el nombre, cuerpo con nombre, correo y mensaje, y `Reply-To` igual al correo del visitante.
- [ ] Tras el envío exitoso se muestra la terminal "MENSAJE RECIBIDO… GRACIAS, {NOMBRE EN MAYÚSCULAS}" y "ENVIAR OTRO MENSAJE" limpia el formulario.
- [ ] Un correo con formato inválido, o textos que exceden los máximos, devuelve error de validación del servidor y se muestra `[ERROR]` sin perder lo escrito.
- [ ] Si Resend falla (p. ej. `RESEND_API_KEY` inválida) se muestra `[ERROR]` genérico y la API key no aparece en el cliente ni en la respuesta.
- [ ] Con el honeypot `website` relleno no se envía ningún correo y la UI muestra éxito.
- [ ] Mientras el envío está en curso el botón está deshabilitado y muestra "ENVIANDO…".
- [ ] `RESEND_API_KEY` no aparece en el bundle del cliente (`NEXT_PUBLIC_` no se usa).
- [ ] `.env.example` existe con las 3 variables y sin valores reales; `.env.local` no está versionado.
- [ ] El diseño (colores, tipografías, glow, responsive móvil) coincide con `arcade-vault-standalone.html`.
- [ ] `npm run lint` y `npm run build` pasan sin errores.

## Decisiones tomadas y descartadas

- **Sí:** ruta `/acerca-de` — coincide con el label en español del nav y con la convención de rutas del proyecto (`/salon`, `/biblioteca`).
- **Sí:** Server Action + `useActionState` — la API key queda en servidor, sin endpoint público extra y con menos código que un Route Handler.
- **No:** Route Handler `POST /api/contact` — solo tendría sentido si se consumiera fuera de la app.
- **Sí:** destino y remitente en variables de entorno (`CONTACT_TO_EMAIL`, `RESEND_FROM`) — cambiar de correo o pasar a dominio verificado no requiere tocar código.
- **Sí:** `replyTo` = correo del visitante — permite responder directo desde el buzón del equipo.
- **Sí:** validación de servidor + honeypot — defensa mínima contra bots sin infraestructura extra.
- **No:** rate limiting — requiere almacenamiento externo; se evalúa en otro spec si aparece abuso.
- **No:** autorespuesta al visitante — con el sandbox de Resend solo se puede entregar al dueño de la cuenta y duplica superficie de abuso.
- **Sí:** conservar los valores escritos ante error — evita que el usuario pierda su mensaje.
- **Sí:** el estado de éxito y el error reutilizan el look de terminal del prototipo — mantiene la fidelidad visual.
- **Sí:** `.env.example` versionado — documenta las variables requeridas.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Sandbox `onboarding@resend.dev` solo entrega al correo dueño de la cuenta Resend | Documentarlo en `.env.example`; `CONTACT_TO_EMAIL` debe ser ese correo hasta verificar un dominio. |
| Inyección de cabeceras/HTML por el contenido del visitante | Escapar HTML al armar el cuerpo, o enviar solo `text`; nunca concatenar el correo del visitante en `from`/`subject` sin sanitizar saltos de línea. |
| Spam sin rate limiting | Honeypot + límites de longitud; rate limiting queda como spec futuro. |
| `.gitignore` con `.env*` ignora `.env.example` | Agregar excepción `!.env.example`. |
| Server Actions en Next 16 pueden diferir de lo conocido | Leer la guía en `node_modules/next/dist/docs/` antes del paso 6. |

## Qué **no** está en este spec

- Rate limiting, captcha o autorespuesta al visitante.
- Persistencia de mensajes o panel de administración.
- Dominio verificado y templates React Email.
- SEO adicional y pruebas automatizadas.
