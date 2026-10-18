# COLUMNAS — preguntas abiertas de la jam

Fecha: 2026-10-18. Cada duda **ya tiene un valor por defecto aplicado** en los tres specs: ninguna queda como TODO dentro de una variante. Si la respuesta es otra, aquí está qué variante y qué sección hay que tocar.

---

### 1. ¿`sort_order: 8` o reordenar el catálogo?

- **Valor por defecto aplicado:** `sort_order: 8`. La tabla real usa 1, 2, 3, 5 y 6; el `4` está comprometido con la jam de `gloton`, el `5` lo ocupó `frogger` y el `7` está comprometido con la jam de `invasores`.
- **Si la respuesta es otra:** si se prefiere que COLUMNAS salga antes en la biblioteca, cambia sólo el número del `insert` en `## Modelo de datos` y el criterio de aceptación de la fila, en **las tres variantes**. Reordenar el resto del catálogo es un `UPDATE` sobre filas ajenas y debería ir en un spec aparte.

### 2. ¿Portada nueva `.cover-columnas` o reutilizar una huérfana?

- **Valor por defecto aplicado:** **crear `.cover-columnas`** en `app/globals.css`, en las tres variantes. Es el único candidato que no viene del prototipo y no tiene clase propia, tal y como avisaba la ficha 009.
- **Si la respuesta es otra:** las dos clases huérfanas son `.cover-rana` (rana sobre troncos) y `.cover-duelo` (dos palas de Pong): ninguna representa gemas, así que reutilizar obligaría a rediseñar la clase, que es el mismo trabajo con peor nombre. Si aun así se prefiere no tocar `globals.css`, cambia `cover` en el `insert`, el punto 1 de `## Alcance`, el bloque de archivos y el criterio de la portada en las tres variantes.

### 3. ¿Color `cyan` o `magenta`?

- **Valor por defecto aplicado:** **`cyan`**, en las tres variantes. La ficha 009 proponía `magenta`, pero `magenta` es exactamente el color de `tetris`: en la rejilla de la biblioteca los dos PUZZLE saldrían con el mismo neón, que es justo la confusión que esta jam existe para evitar. Las gemas son de seis colores, así que ningún color del catálogo es «el correcto» por mecánica.
- **Si la respuesta es otra:** `magenta` respeta la ficha 009 y pega con la portada si se dibuja en tonos violeta. Cambia el `insert`, el criterio de aceptación de la fila y, opcionalmente, el gradiente de `.cover-columnas`, en las tres variantes. No afecta al motor.

### 4. ¿Pozo de 6×13 o de 6×16?

- **Valor por defecto aplicado:** **6 columnas × 13 filas**, el tamaño del Columns original, con `CELL = 40` → pozo de 240×520 px.
- **Si la respuesta es otra:** 6×16 da más margen de recuperación y parte el aspecto a `9 / 16`; obliga a recalcular el canvas lógico, el `aspect` del registro, la cota de puntuación de C y todos los criterios que citan dimensiones, en las tres variantes.

### 5. ¿Cuántos colores de gema?

- **Valor por defecto aplicado:** **6** en A y B (cian, magenta, amarillo, verde, naranja, violeta, de la paleta de `app/globals.css`). En C son **4 en la veta 1, 5 en la 2 y 6 a partir de la 3**, como curva de dificultad.
- **Si la respuesta es otra:** bajar a 5 colores hace el juego mucho más fácil y sube el techo práctico de A y B; subir a 7 lo vuelve caótico en un pozo de 6 de ancho. Cambia `GEM_COLORS` en `constants.ts` y, en C, la tabla de vetas.

### 6. ¿Las gemas llevan glifo interior además de color?

- **Valor por defecto aplicado:** **sí**, en las tres: cada color lleva un glifo distinto (círculo, rombo, cruz, triángulo, anillo, cuadrado) dibujado en el centro. Es accesibilidad para daltonismo y cuesta seis `path` en `entities.ts`.
- **Si la respuesta es otra:** quitarlos deja gemas de color plano, más limpias y más cercanas al arcade original. Afecta al dibujo en `## Alcance` y al criterio de aceptación del glifo, en las tres variantes.

### 7. ¿`↑` cicla hacia abajo o hacia arriba?

- **Valor por defecto aplicado:** **hacia abajo**: `[arriba, medio, abajo]` pasa a `[abajo, arriba, medio]` (cada gema baja una posición y la de abajo sube al tope). Una sola dirección de ciclado, como el original de recreativa.
- **Si la respuesta es otra:** añadir el ciclado inverso con `Z` o con el botón B del mando cuesta una tecla más y una línea de motor, pero deja el botón B sin la caída instantánea. Afecta a `## Alcance` → controles, a la entrada `touch` del registro y al hint de controles, en las tres variantes.

### 8. ¿Caída instantánea con `ESPACIO`?

- **Valor por defecto aplicado:** **sí**, la caída instantánea existe en las tres variantes y el trío se fija al llegar, sin lock delay. En **A y B** suma **+1 punto por fila** recorrida, igual que el descenso rápido con `↓`; en **C no puntúa**, porque con objetivos por veta cualquier punto por fila rompería la cota de 129 100 que el spec demuestra.
- **Si la respuesta es otra:** quitarla hace la partida más lenta y baja el techo práctico de A y B; subirla a +2 por fila (como el hard drop de TETRIS) inflaría la puntuación por pulsar una tecla, no por jugar bien; darle puntos en C obliga a rehacer la demostración de la cota o a renunciar a ella. Afecta a `## Alcance` → puntuación y al criterio de la caída de la variante que se toque.

### 9. ¿Multiplicador de cascada `[1, 2, 4, 8, 16]` con tope en ×16?

- **Valor por defecto aplicado:** sí, en las tres. El escalón 1 es la alineación que provoca el jugador; del 2 en adelante son cascadas automáticas.
- **Si la respuesta es otra:** una curva lineal (`×1, ×2, ×3, …`) premia menos las cadenas largas y aplana el leaderboard; sin tope, una cascada de 8 escalones multiplicaría por 128 y una sola partida afortunada decidiría el Salón. Afecta a `CHAIN_MULT` en `constants.ts`, a la cota de C y a los criterios de puntuación de las tres.

### 10. ¿A y B sin techo de puntuación?

- **Valor por defecto aplicado:** **sí**: A y B son modos sin fin, igual que el TETRIS ya implementado, y su puntuación no está acotada por diseño. El motor aplica `Math.min(score, 9_999_999)` al emitir, de modo que el `CHECK` de `scores` nunca puede romperse, y la partida continúa.
- **Si la respuesta es otra:** si se quiere un techo real para que el leaderboard sea comparable, lo natural es poner un objetivo (como hace C) o un límite de tríos. Eso convertiría A en algo distinto de «mínima fiel», así que la opción recomendada si se quiere techo es elegir C. Afecta a `## Alcance` → fin de partida y a los criterios de A y B.

### 11. ¿La aceleración de A y B se basa en gemas eliminadas?

- **Valor por defecto aplicado:** sí: `dropInterval = max(150, 800 − floor(gemas / 15) × 50)` ms, sin campo de nivel en el HUD (`engineLevel: false`). Garantiza que la partida termina y evita inventar un «nivel» que no existe en el diseño.
- **Si la respuesta es otra:** una velocidad constante hace que un jugador bueno no pierda nunca; un nivel explícito con `engineLevel: true` obliga a decidir qué es un nivel en un modo sin fin. Afecta a `## Alcance` → velocidad y a la entrada del registro de A y B.

### 12. (Variante B) ¿Cada cuántas gemas llega el prisma?

- **Valor por defecto aplicado:** `PRISM_EVERY = 25` gemas eliminadas. El HUD muestra el campo **PRISMA** con la cuenta atrás.
- **Si la respuesta es otra:** 15 lo convierte en el eje de la partida y dispara la puntuación; 40 lo vuelve anecdótico. Afecta sólo a `B-juego-columnas.md`, sección `## Alcance` → reglas del twist, y al criterio de la cuenta atrás.

### 13. (Variante B) ¿El prisma barre el color de debajo o el color que más abunda?

- **Valor por defecto aplicado:** el color de la gema que queda **directamente debajo** de la gema inferior del prisma al posarse. Si el prisma aterriza en el suelo sin ninguna gema debajo, no barre nada y se queda como tres gemas grises inertes que sólo desaparecen con el barrido de un prisma posterior.
- **Si la respuesta es otra:** barrer el color más abundante quita la decisión del jugador y convierte el prisma en un botón de «más puntos». Afecta sólo a `B-juego-columnas.md`, reglas del twist y criterios del prisma.

### 14. (Variante B) ¿El barrido del prisma puntúa a ×2 o a ×1?

- **Valor por defecto aplicado:** **×2** y cuenta como escalón 1, de modo que las cascadas que desencadena siguen con ×2, ×4, ×8, ×16. Más `PRISM_BONUS = 200` por prisma usado.
- **Si la respuesta es otra:** a ×1 el prisma pasa a ser una herramienta de limpieza y no de puntuación, y la fórmula de B deja de diferenciarse de la de A, que es el motivo de existir del twist. Afecta sólo a `B-juego-columnas.md`.

### 15. (Variante C) ¿5 vetas con objetivo de 30/40/50/60/70 gemas?

- **Valor por defecto aplicado:** sí; `levelJump: 5` en el overlay de pausa. La veta termina en cuanto el contador de gemas de esa veta llega al objetivo, aunque la resolución en curso lo supere.
- **Si la respuesta es otra:** objetivos más altos alargan mucho la partida y suben la cota de 129 100; menos vetas dejan `levelJump` casi sin sentido. Afecta a `levels.ts`, a la cota de puntuación y a los criterios de veta de `C-juego-columnas.md`.

### 16. (Variante C) ¿Las gemas de roca aparecen desde la veta 3?

- **Valor por defecto aplicado:** sí: desde la veta 3, **uno de cada 5 tríos** lleva su gema central sustituida por una roca gris, que no casa con nada y sólo desaparece si una gema **ortogonalmente adyacente** se elimina (50 puntos).
- **Si la respuesta es otra:** meterlas desde la veta 1 hace el arranque hostil; quitarlas deja C como «A con niveles y sonido» y le resta la mitad de su carácter de autor. Afecta a `levels.ts`, a `entities.ts` y a los criterios de la roca en `C-juego-columnas.md`.

### 17. (Variante C) ¿Audio sintetizado o archivos de sonido?

- **Valor por defecto aplicado:** **sintetizado** con Web Audio API (osciladores y envolventes en `audio.ts`), sin ningún binario en `public/games/columnas/`. `AudioContext` se crea en el primer gesto del usuario y se cierra en `destroy()`.
- **Si la respuesta es otra:** archivos `.wav`/`.ogg` suenan mejor pero añaden binarios al repositorio y un paso de assets al plan. Afecta a `## Alcance` → audio, al bloque de archivos y al plan de `C-juego-columnas.md`.

### 18. ¿Hay que actualizar `references/catalogo-juegos.md`?

- **Valor por defecto aplicado:** sí, en el paso de pulido de las tres variantes: el snapshot es del 2026-10-06 y ya le falta `frogger`. La variante que se implemente añade su fila **y** la de `frogger`.
- **Si la respuesta es otra:** si se prefiere regenerar el snapshot entero en un spec de mantenimiento aparte, quita ese punto del plan y del bloque de archivos de la variante elegida.
