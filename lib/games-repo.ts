import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { Game, GameCategory, GameColor, GameStats, ScoreRow } from "@/lib/data";

type GameRow = Database["public"]["Tables"]["games"]["Row"];

function toGame(row: GameRow): Game {
  return {
    id: row.id,
    title: row.title,
    short: row.short,
    long: row.long,
    category: row.category as GameCategory,
    cover: row.cover,
    color: row.color as GameColor,
  };
}

// DD/MM/YYYY en UTC para que servidor y cliente coincidan.
function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`No se pudo cargar el catálogo: ${error.message}`);
  return data.map(toGame);
}

export async function getGame(id: string): Promise<Game | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("games").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`No se pudo cargar el juego: ${error.message}`);
  return data ? toGame(data) : null;
}

// Orden: score desc, created_at asc (el más antiguo gana el empate).
export async function getTopScores(gameId: string, limit: number): Promise<ScoreRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`No se pudo cargar el ranking: ${error.message}`);
  return data.map((row, i) => ({
    rank: i + 1,
    name: row.name,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}

// Una sola consulta; best/plays por juego se agregan aquí. Juegos sin partidas no aparecen en el mapa.
export async function getGameStats(): Promise<Record<string, GameStats>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("scores").select("game_id, score");
  if (error) throw new Error(`No se pudieron cargar las estadísticas: ${error.message}`);

  const stats: Record<string, GameStats> = {};
  for (const { game_id, score } of data) {
    const s = (stats[game_id] ??= { best: null, plays: 0 });
    s.plays += 1;
    if (s.best === null || score > s.best) s.best = score;
  }
  return stats;
}
