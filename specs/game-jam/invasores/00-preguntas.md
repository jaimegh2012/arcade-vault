# INVASORES — preguntas abiertas de la jam

Fecha: 2026-10-17. Cada duda **ya tiene un valor por defecto aplicado** en los tres specs: ninguna queda como TODO dentro de una variante. Si la respuesta es otra, aquí está qué variante y qué sección hay que tocar.

---

### 1. ¿`sort_order: 7` o reordenar el catálogo?

- **Valor por defecto aplicado:** `sort_order: 7`. La tabla real usa 1, 2, 3, 5 y 6; el `5` que la ficha 005 reservaba para este juego lo ocupó `frogger`, y el `4` está comprometido con la jam de `gloton`.
- **Si la respuesta es otra:** si se prefiere que INVASORES salga antes en la biblioteca, cambia sólo el número del `insert` en `## Modelo de datos` y el criterio de aceptación de la fila, en **las tres variantes**. Si además se quiere reordenar el resto del catálogo, eso es un `UPDATE` sobre filas ajenas y debería ir en un spec aparte.

### 2. ¿`short` del prototipo o uno nuevo?

- **Valor por defecto aplicado:** `Defiende el planeta de filas alienígenas.`, literal de `references/templates/data.jsx:51`, igual en las tres variantes.
- **Si la respuesta es otra:** una línea en `## Modelo de datos` de las tres variantes. El `long` sí es distinto por variante y no se toca.

### 3. ¿Color `green` o `magenta`?

- **Valor por defecto aplicado:** `green`, como el prototipo y como la paleta dominante de `.cover-invaders`. Coincide con `snake` y `frogger`, que ya son verdes.
- **Si la respuesta es otra:** `magenta` liberaría el verde y encajaría con las filas centrales de la portada. Cambia el `insert` y el criterio de la fila en las tres variantes; no afecta al motor.

### 4. ¿Formación de 5×11 (55) o de 6×11 (66)?

- **Valor por defecto aplicado:** **5×11 = 55**, el original de 1978. Fija el bloque en 512×184 px, el techo de 990 por ola y el reparto 30/20/20/10/10.
- **Si la respuesta es otra:** 6×11 recalcula en las tres variantes el alto del bloque, `FORM_Y`, la puntuación máxima (990 → 1210 por ola) y todos los criterios de aceptación que citan un número de invasores o un techo. En C además hay que revisar la tabla de olas.

### 5. ¿Un solo disparo del jugador en pantalla?

- **Valor por defecto aplicado:** **sí**, como el original: no se puede volver a disparar hasta que el anterior impacte o salga de pantalla. Es lo que hace que fallar duela.
- **Si la respuesta es otra:** permitir 2 o 3 disparos simultáneos (o una cadencia fija) hace el juego bastante más fácil; afecta a `## Alcance` (constantes de disparo) y al criterio de aceptación del disparo único en las tres variantes, y en C obliga a resubir la dificultad de la tabla de olas.

### 6. ¿Búnkeres destructibles por celdas de 6×6 px?

- **Valor por defecto aplicado:** rejilla de 12×8 celdas de 6×6 px por búnker; cada impacto borra la celda alcanzada y sus 4 vecinas ortogonales.
- **Si la respuesta es otra:** celdas de 4×4 (18×12 por búnker) se ven más orgánicas pero multiplican por 2,25 el coste de colisión; celdas de 8×8 son más baratas y más toscas. Cambia `BUNKER_COLS`/`BUNKER_ROWS` en `constants.ts` y el criterio del búnker en las tres variantes.

### 7. ¿Cuántos búnkeres, 4 o 3?

- **Valor por defecto aplicado:** **4**, en `x = 92, 268, 444, 620`.
- **Si la respuesta es otra:** 3 búnkeres dejan más hueco para esquivar y menos cobertura; cambia la lista de posiciones en `constants.ts` y el criterio de aceptación del arranque en las tres variantes.

### 8. ¿La formación que toca la superficie es derrota inmediata o resta una vida?

- **Valor por defecto aplicado:** **derrota inmediata** a `SURFACE_Y = 520`, sin descontar vidas, en las tres variantes.
- **Si la respuesta es otra:** restar una vida y reiniciar la ola es más indulgente, pero en A y B (ola única) reiniciaría la ola con los invasores ya muertos o con la formación entera, y hay que decidir cuál. Afecta a las reglas de fin y al criterio de la superficie.

### 9. (Variante B) ¿La cadena se rompe también al fallar un disparo?

- **Valor por defecto aplicado:** **no**: la cadena sólo se rompe al derribar a un invasor **no marcado**. Fallar ya se castiga con el disparo único.
- **Si la respuesta es otra:** romperla al fallar convierte B en un juego de precisión muy duro y baja mucho el techo práctico. Afecta sólo a `B-juego-invasores.md`, sección `## Alcance` → reglas del twist, y a los criterios de la cadena.

### 10. (Variante B) ¿Rotación de la marca cada 6 s?

- **Valor por defecto aplicado:** `MARK_ROTATE_MS = 6000`; si el marcado sobrevive 6 s, la marca salta a otro invasor vivo al azar y la cadena no cambia.
- **Si la respuesta es otra:** un valor más alto (10–12 s) hace la cadena más difícil y la marca más frustrante cuando cae detrás; sin rotación, la mecánica puede quedarse inerte. Cambia una constante en `B-juego-invasores.md` y su criterio de aceptación.

### 11. (Variante B) ¿Bonus final `mejor cadena × 100`?

- **Valor por defecto aplicado:** sí, aplicado también al perder, lo que pone el techo en **10 450**.
- **Si la respuesta es otra:** sin bonus el techo baja a 4950 y la cadena deja de ser un objetivo a largo plazo; con un bonus mayor (×200) el twist domina el score. Cambia `CHAIN_BONUS`, el cálculo de la puntuación máxima, el `long` del `insert` y dos criterios de aceptación en `B-juego-invasores.md`.

### 12. (Variante B) ¿Campo nuevo `hasChain`/`onChain` en el contrato?

- **Valor por defecto aplicado:** sí, calcado de `hasLines`/`onLines` del SPEC 07; el HUD gana `CADENA` y ningún juego existente lo declara.
- **Si la respuesta es otra:** si no se quiere tocar `types.ts`, `registry.ts` y `game-player.tsx`, la alternativa es dibujar la cadena en el canvas, lo que contradice la regla de "sólo en canvas lo que el HUD no puede mostrar". Afecta al punto 4 del alcance de `B-juego-invasores.md` y a su plan (paso 3).

### 13. (Variante C) ¿5 olas o bucle infinito?

- **Valor por defecto aplicado:** **5 olas** con tabla explícita y victoria al limpiar la quinta; techo declarado de **16 950**.
- **Si la respuesta es otra:** un bucle infinito es más fiel al arcade pero deja la puntuación máxima indefinida, que es justo lo que la jam exige declarar. Afectaría a `levels.ts`, al techo, a `levelJump` y a varios criterios de `C-juego-invasores.md`.

### 14. (Variante C) ¿Audio sintetizado o archivos `.mp3`?

- **Valor por defecto aplicado:** **sintetizado** con Web Audio API (marcha de 4 tonos + 4 efectos), sin ningún binario en `public/`.
- **Si la respuesta es otra:** con `.mp3` el sonido es más controlable y el patrón ya existe en `arkanoid` (`cloneNode().play()`), pero hay que producir o licenciar cinco archivos y añadirlos a `public/games/invasores/`. Afecta a `audio.ts`, al bloque de archivos y a los criterios de audio de `C-juego-invasores.md`.

### 15. (Variante C) ¿Vida extra a los 5000 puntos?

- **Valor por defecto aplicado:** una sola vida extra la primera vez que se llega a 5000.
- **Si la respuesta es otra:** sin vida extra, las partidas son más cortas y el techo sigue siendo 16 950 (el bonus no depende de las vidas). Cambia `EXTRA_LIFE_AT`, una regla y un criterio de `C-juego-invasores.md`.

### 16. ¿Hay que actualizar `references/catalogo-juegos.md` en el mismo spec?

- **Valor por defecto aplicado:** sí; el snapshot está fechado el 2026-10-06 y ya no incluye `frogger`. Las tres variantes lo listan como archivo modificado y lo actualizan en el paso de pulido.
- **Si la respuesta es otra:** si se prefiere refrescar el snapshot completo (incluyendo `frogger` y los `sort_order`) en un spec de mantenimiento aparte, quita esa línea del bloque de archivos y del plan en las tres variantes.
