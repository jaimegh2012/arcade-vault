export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  category: GameCategory;
  cover: string; // clase CSS del fondo de portada (ya definida en globals.css)
  color: GameColor;
};

export type GameStats = { best: number | null; plays: number };

export type ScoreRow = { rank: number; name: string; score: number; date: string }; // date: DD/MM/YYYY

export const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
