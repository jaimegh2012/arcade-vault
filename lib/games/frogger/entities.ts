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
