import {
  LANE_PERIOD,
  ROW_RIVER_BOT,
  ROW_RIVER_TOP,
  ROW_ROAD_BOT,
  ROW_ROAD_TOP,
  SPEED_PER_LEVEL,
  TURTLE_SUBMERGED_S,
  TURTLE_VISIBLE_S,
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
  targetCol: number;
  targetRow: number;
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
