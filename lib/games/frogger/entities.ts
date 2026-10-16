import {
  CELL,
  COLOR_CARS,
  COLOR_FROG,
  COLOR_FROG_EYE,
  COLOR_FROG_PUPIL,
  COLOR_GOAL_BORDER,
  COLOR_GOAL_SLOT,
  COLOR_GOAL_ZONE,
  COLOR_LOG,
  COLOR_LOG_GRAIN,
  COLOR_RIVER,
  COLOR_ROAD,
  COLOR_ROAD_LINE,
  COLOR_SAFE,
  COLOR_TIME_LOW,
  COLOR_TIME_OK,
  COLOR_TIME_WARN,
  COLOR_TRUCK,
  COLOR_TRUCK_CAB,
  COLOR_TURTLE,
  COLOR_TURTLE_SCALE,
  COLOR_TURTLE_SUBMERGED,
  COLOR_WHEEL,
  COLS,
  FROG_BODY_H,
  FROG_BODY_W,
  GOAL_COLS,
  GOAL_WIDTH,
  H,
  JUMP_MS,
  LANE_PERIOD,
  ROW_GOALS,
  ROW_RIVER_BOT,
  ROW_RIVER_TOP,
  ROW_ROAD_BOT,
  ROW_ROAD_TOP,
  ROWS,
  SPEED_PER_LEVEL,
  TURTLE_SUBMERGED_S,
  TURTLE_VISIBLE_S,
  W,
} from "./constants";

export type Dir = "up" | "down" | "left" | "right";

export type EntityType = "car" | "truck" | "log" | "turtle";

export type Entity = {
  col: number; // columna izquierda (fraccionaria: se mueve de forma continua)
  width: number; // celdas
  type: EntityType;
  // Solo tortugas: la rana no tiene apoyo mientras está sumergida
  submerged?: boolean;
  // Solo tortugas: segundos acumulados en la fase actual del ciclo
  phaseT?: number;
};

export type Lane = {
  row: number;
  speed: number; // celdas/s, siempre positiva
  dir: 1 | -1;
  entities: Entity[];
};

export type Frog = {
  col: number;
  row: number;
  animating: boolean;
  animT: number; // ms transcurridos del salto
  fromCol: number; // origen del salto en curso
  fromRow: number;
  targetCol: number;
  targetRow: number;
  facing: Dir;
};

export const DIR_VECTORS: Record<Dir, { col: number; row: number }> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};

type LaneDef = {
  row: number;
  kind: "road" | "log" | "turtle";
  speed: number; // celdas/s en el nivel 1
  dir: 1 | -1;
  widths: number[]; // ancho de cada entidad del carril, en celdas
};

// Carretera: filas 8–12. Río: filas 1–6. Los huecos salen de repartir el periodo
// del anillo entre las entidades (siempre >= 3 celdas, atravesables).
const LANE_DEFS: LaneDef[] = [
  { row: 1, kind: "log", speed: 1.8, dir: 1, widths: [3, 3, 3] },
  { row: 2, kind: "turtle", speed: 1.5, dir: -1, widths: [2, 2, 2, 2] },
  { row: 3, kind: "log", speed: 2.6, dir: 1, widths: [4, 4] },
  { row: 4, kind: "turtle", speed: 2.0, dir: -1, widths: [3, 3, 3] },
  { row: 5, kind: "log", speed: 3.0, dir: 1, widths: [4, 2, 3] },
  { row: 6, kind: "turtle", speed: 1.4, dir: -1, widths: [2, 2, 2, 2] },
  { row: 8, kind: "road", speed: 2.5, dir: -1, widths: [1, 1, 1] },
  { row: 9, kind: "road", speed: 3.5, dir: 1, widths: [3, 3] },
  { row: 10, kind: "road", speed: 2.0, dir: -1, widths: [1, 1, 1, 1] },
  { row: 11, kind: "road", speed: 4.2, dir: 1, widths: [2, 2, 2] },
  { row: 12, kind: "road", speed: 3.0, dir: -1, widths: [3, 1, 2] },
];

const TURTLE_CYCLE_S = TURTLE_VISIBLE_S + TURTLE_SUBMERGED_S;

function entityType(kind: LaneDef["kind"], width: number): EntityType {
  if (kind === "log") return "log";
  if (kind === "turtle") return "turtle";
  return width >= 3 ? "truck" : "car";
}

/** Construye los 11 carriles (5 de carretera, 6 de río). Cada nivel suma +15 % de velocidad. */
export function buildLanes(level: number): Lane[] {
  const scale = SPEED_PER_LEVEL ** Math.max(0, level - 1);
  return LANE_DEFS.map((def) => {
    const total = def.widths.reduce((a, b) => a + b, 0);
    const gap = (LANE_PERIOD - total) / def.widths.length;
    // Desfase por fila para que los carriles no queden alineados
    let col = (def.row * 1.7) % LANE_PERIOD;
    const entities = def.widths.map((width, i): Entity => {
      const e: Entity = { col: col % LANE_PERIOD, width, type: entityType(def.kind, width) };
      if (def.kind === "turtle") {
        // Fases escalonadas: no todas las tortugas se sumergen a la vez
        e.phaseT = (i * 1.5 + def.row * 0.7) % TURTLE_CYCLE_S;
        e.submerged = e.phaseT >= TURTLE_VISIBLE_S;
      }
      col += width + gap;
      return e;
    });
    return { row: def.row, speed: def.speed * scale, dir: def.dir, entities };
  });
}

export function isRoadRow(row: number): boolean {
  return row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOT;
}

export function isRiverRow(row: number): boolean {
  return row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT;
}

/** Entidad de río que sostiene a la rana (tronco o tortuga visible), con su carril. */
export function getSupport(frog: Frog, lanes: Lane[]): { lane: Lane; entity: Entity } | null {
  const x = frog.col + 0.5; // centro de la rana
  for (const lane of lanes) {
    if (lane.row !== frog.row) continue;
    for (const entity of lane.entities) {
      if (entity.type !== "log" && entity.type !== "turtle") continue;
      if (entity.submerged) continue;
      if (x >= entity.col && x < entity.col + entity.width) return { lane, entity };
    }
  }
  return null;
}

/** Avanza entidades en anillo y el ciclo de inmersión de las tortugas. dt en segundos. */
export function updateLanes(lanes: Lane[], dt: number) {
  const cycle = TURTLE_VISIBLE_S + TURTLE_SUBMERGED_S;
  for (const lane of lanes) {
    for (const e of lane.entities) {
      e.col += lane.speed * lane.dir * dt;
      if (lane.dir === 1 && e.col >= COLS) e.col -= LANE_PERIOD;
      else if (lane.dir === -1 && e.col + e.width <= 0) e.col += LANE_PERIOD;
      if (e.type === "turtle") {
        e.phaseT = ((e.phaseT ?? 0) + dt) % cycle;
        e.submerged = e.phaseT >= TURTLE_VISIBLE_S;
      }
    }
  }
}

export function createFrog(col: number, row: number): Frog {
  return {
    col,
    row,
    animating: false,
    animT: 0,
    fromCol: col,
    fromRow: row,
    targetCol: col,
    targetRow: row,
    facing: "up",
  };
}

// ── Dibujo ──────────────────────────────────────────────────────────────────

export function drawBoard(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, W, H);
  const zones: [number, number, string][] = [
    [ROW_GOALS, ROW_GOALS, COLOR_GOAL_ZONE],
    [ROW_RIVER_TOP, ROW_RIVER_BOT, COLOR_RIVER],
    [ROW_RIVER_BOT + 1, ROW_ROAD_TOP - 1, COLOR_SAFE],
    [ROW_ROAD_TOP, ROW_ROAD_BOT, COLOR_ROAD],
    [ROW_ROAD_BOT + 1, ROWS - 1, COLOR_SAFE],
  ];
  for (const [from, to, color] of zones) {
    ctx.fillStyle = color;
    ctx.fillRect(0, from * CELL, W, (to - from + 1) * CELL);
  }
  // Líneas discontinuas entre carriles de carretera
  ctx.strokeStyle = COLOR_ROAD_LINE;
  ctx.lineWidth = 2;
  ctx.setLineDash([16, 14]);
  for (let r = ROW_ROAD_TOP + 1; r <= ROW_ROAD_BOT; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL);
    ctx.lineTo(W, r * CELL);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

export function drawGoals(ctx: CanvasRenderingContext2D, goals: boolean[]) {
  GOAL_COLS.forEach((col, i) => {
    const x = col * CELL;
    const y = ROW_GOALS * CELL;
    const w = GOAL_WIDTH * CELL;
    ctx.fillStyle = COLOR_GOAL_SLOT;
    ctx.fillRect(x + 2, y + 3, w - 4, CELL - 6);
    ctx.strokeStyle = COLOR_GOAL_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 3, w - 4, CELL - 6);
    if (goals[i]) drawFrog(ctx, x + w / 2, y + CELL / 2, "down", 0, true);
  });
}

function drawWheels(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  ctx.fillStyle = COLOR_WHEEL;
  for (const wx of [x + 10, x + w - 10]) {
    ctx.beginPath();
    ctx.arc(wx, y + 8, 4, 0, Math.PI * 2);
    ctx.arc(wx, y + CELL - 8, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCar(
  ctx: CanvasRenderingContext2D,
  e: Entity,
  x: number,
  y: number,
  color: string,
  dir: 1 | -1,
) {
  const w = e.width * CELL;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x + 3, y + 8, w - 6, CELL - 16, 5);
  ctx.fill();
  // Parabrisas en el frente
  ctx.fillStyle = "rgba(180, 230, 255, 0.85)";
  ctx.fillRect(dir === 1 ? x + w - 14 : x + 7, y + 11, 7, CELL - 22);
  drawWheels(ctx, x, y, w);
}

function drawTruck(ctx: CanvasRenderingContext2D, e: Entity, x: number, y: number, dir: 1 | -1) {
  const w = e.width * CELL;
  const cabW = CELL - 4;
  const cabX = dir === 1 ? x + w - cabW - 2 : x + 2;
  const boxX = dir === 1 ? x + 2 : x + cabW + 2;
  ctx.fillStyle = COLOR_TRUCK;
  ctx.fillRect(boxX, y + 6, w - cabW - 4, CELL - 12);
  ctx.fillStyle = COLOR_TRUCK_CAB;
  ctx.beginPath();
  ctx.roundRect(cabX, y + 8, cabW, CELL - 16, 4);
  ctx.fill();
  ctx.fillStyle = "rgba(60, 120, 160, 0.9)";
  ctx.fillRect(dir === 1 ? cabX + cabW - 9 : cabX + 3, y + 12, 6, CELL - 24);
  drawWheels(ctx, x, y, w);
}

function drawLog(ctx: CanvasRenderingContext2D, e: Entity, x: number, y: number) {
  const w = e.width * CELL;
  ctx.fillStyle = COLOR_LOG;
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 6, w - 4, CELL - 12, 8);
  ctx.fill();
  ctx.strokeStyle = COLOR_LOG_GRAIN;
  ctx.lineWidth = 2;
  for (let gx = x + 14; gx < x + w - 10; gx += 18) {
    ctx.beginPath();
    ctx.moveTo(gx, y + 11);
    ctx.lineTo(gx + 6, y + CELL - 11);
    ctx.stroke();
  }
}

function drawTurtles(ctx: CanvasRenderingContext2D, e: Entity, x: number, y: number) {
  for (let i = 0; i < e.width; i++) {
    const cx = x + i * CELL + CELL / 2;
    const cy = y + CELL / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, CELL / 2 - 5, 0, Math.PI * 2);
    if (e.submerged) {
      ctx.fillStyle = COLOR_TURTLE_SUBMERGED;
      ctx.fill();
      continue;
    }
    ctx.fillStyle = COLOR_TURTLE;
    ctx.fill();
    ctx.strokeStyle = COLOR_TURTLE_SCALE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.moveTo(cx - 14, cy);
    ctx.lineTo(cx - 6, cy);
    ctx.moveTo(cx + 6, cy);
    ctx.lineTo(cx + 14, cy);
    ctx.stroke();
  }
}

/** Dibuja las entidades de un carril; las que cruzan el borde se recortan con el canvas. */
export function drawLane(ctx: CanvasRenderingContext2D, lane: Lane) {
  const y = lane.row * CELL;
  lane.entities.forEach((e, i) => {
    const x = e.col * CELL;
    if (x >= W || x + e.width * CELL <= 0) return;
    if (e.type === "car") {
      drawCar(ctx, e, x, y, COLOR_CARS[(lane.row + i) % COLOR_CARS.length], lane.dir);
    } else if (e.type === "truck") drawTruck(ctx, e, x, y, lane.dir);
    else if (e.type === "log") drawLog(ctx, e, x, y);
    else drawTurtles(ctx, e, x, y);
  });
}

const FACING_ANGLE: Record<Dir, number> = {
  up: 0,
  right: Math.PI / 2,
  down: Math.PI,
  left: -Math.PI / 2,
};

/** Rana centrada en (cx, cy). `t` 0–1 = progreso del salto (patas extendidas, ligero zoom). */
export function drawFrog(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  facing: Dir,
  t: number,
  silhouette = false,
) {
  const hop = Math.sin(t * Math.PI); // 0 en reposo, 1 a mitad de salto
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(FACING_ANGLE[facing]);
  ctx.scale(1 + 0.25 * hop, 1 + 0.25 * hop);
  ctx.fillStyle = silhouette ? "#1fbf63" : COLOR_FROG;
  // Patas: más abiertas durante el salto
  const spread = 4 + 7 * hop;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * (FROG_BODY_W / 2 + 1), -spread, 4, 7, side * 0.5, 0, Math.PI * 2);
    ctx.ellipse(side * (FROG_BODY_W / 2 - 1), spread + 4, 4, 7, -side * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, FROG_BODY_W / 2, FROG_BODY_H / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const side of [-1, 1]) {
    ctx.fillStyle = COLOR_FROG_EYE;
    ctx.beginPath();
    ctx.arc(side * 6, -8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLOR_FROG_PUPIL;
    ctx.beginPath();
    ctx.arc(side * 6, -9, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Rana en su posición, interpolada entre origen y destino durante el salto. */
export function drawFrogAt(ctx: CanvasRenderingContext2D, frog: Frog) {
  const t = frog.animating ? Math.min(frog.animT / JUMP_MS, 1) : 0;
  const col = frog.animating ? frog.fromCol + (frog.targetCol - frog.fromCol) * t : frog.col;
  const row = frog.animating ? frog.fromRow + (frog.targetRow - frog.fromRow) * t : frog.row;
  drawFrog(ctx, col * CELL + CELL / 2, row * CELL + CELL / 2, frog.facing, t);
}

/** Barra de tiempo en la franja inferior de la fila de salida (lo único que el HUD de React no muestra). */
export function drawTimeBar(ctx: CanvasRenderingContext2D, fraction: number) {
  const f = Math.max(0, Math.min(1, fraction));
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(0, H - 8, W, 8);
  ctx.fillStyle = f > 0.5 ? COLOR_TIME_OK : f > 0.25 ? COLOR_TIME_WARN : COLOR_TIME_LOW;
  ctx.fillRect(0, H - 8, W * f, 8);
}
