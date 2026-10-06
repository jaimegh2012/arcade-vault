export type Tone = "cyan" | "magenta" | "yellow" | "green";

export type Feature = {
  icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";
  title: string;
  desc: string;
  tone: Tone;
};
export type HomeStat = { n: string; unit: string; sub: string };
export type RecentScore = { player: string; game: string; score: number; when: string; tone: Tone };
export type TopPlayer = { rank: number; player: string; score: number };
export type Faq = { q: string; a: string };

export const FEATURES: Feature[] = [
  {
    icon: "GAMEPAD",
    title: "JUEGOS CLÁSICOS",
    desc: "Arkanoid, Tetris, Snake y muchos más. Los mejores arcades de todos los tiempos en un solo lugar.",
    tone: "cyan",
  },
  {
    icon: "FREE",
    title: "100% GRATIS",
    desc: "Sin suscripciones, sin pagos ocultos. Todos los juegos disponibles de forma gratuita.",
    tone: "yellow",
  },
  {
    icon: "TROPHY",
    title: "LADDER BOARDS",
    desc: "Compite con jugadores de todo el mundo. Escala el ranking y demuestra quién es el mejor.",
    tone: "magenta",
  },
  {
    icon: "ROCKET",
    title: "SIEMPRE CRECIENDO",
    desc: "Agregamos nuevos juegos constantemente. Vuelve seguido, siempre habrá algo nuevo que jugar.",
    tone: "green",
  },
];

export const HOME_STATS: HomeStat[] = [
  { n: "12+", unit: "JUEGOS", sub: "Y CONTANDO" },
  { n: "MILES", unit: "DE PARTIDAS", sub: "JUGADAS CADA DÍA" },
  { n: "GLOBAL", unit: "RANKING", sub: "COMPITE CON EL MUNDO" },
];

export const RECENT_SCORES: RecentScore[] = [
  { player: "NEONFOX", game: "Tetris", score: 184220, when: "hace 2 min", tone: "magenta" },
  { player: "PX_KAI", game: "Glotón", score: 96400, when: "hace 5 min", tone: "yellow" },
  { player: "Z3R0COOL", game: "Invasores", score: 54190, when: "hace 8 min", tone: "green" },
  { player: "VAULT_07", game: "Asteroides", score: 41200, when: "hace 12 min", tone: "cyan" },
  { player: "GLITCHA", game: "Arkanoid", score: 28450, when: "hace 18 min", tone: "cyan" },
  { player: "ARKADYA", game: "Snake", score: 7820, when: "hace 24 min", tone: "green" },
  { player: "CYBER_LU", game: "Ranaria", score: 18900, when: "hace 31 min", tone: "yellow" },
];

export const TOP_PLAYERS: TopPlayer[] = [
  { rank: 1, player: "NEONFOX", score: 312840 },
  { rank: 2, player: "PX_KAI", score: 248110 },
  { rank: 3, player: "M00NRYU", score: 196720 },
  { rank: 4, player: "VAULT_07", score: 154300 },
  { rank: 5, player: "GLITCHA", score: 138900 },
];

export const PRICING_FEATURES: string[] = [
  "Acceso a todos los juegos",
  "Ranking global y salón de la fama",
  "Sin anuncios entre partidas",
  "Guarda tus puntuaciones",
  "Nuevos juegos cada mes",
  "Funciona en cualquier navegador",
];

export const FAQS: Faq[] = [
  {
    q: "¿REALMENTE ES GRATIS?",
    a: 'Sí. Arcade Vault es un proyecto sin fines de lucro hecho por amor a los clásicos. No hay versión "premium" escondida.',
  },
  {
    q: "¿NECESITO CREAR CUENTA?",
    a: "No. Puedes jugar como invitado. Si quieres guardar tu puntuación y aparecer en el ranking, regístrate en 10 segundos.",
  },
  {
    q: "¿CÓMO SOBREVIVEN SIN COBRAR?",
    a: "Es un proyecto comunitario. Si te gusta, compártelo. Esa es toda la moneda que aceptamos.",
  },
];
