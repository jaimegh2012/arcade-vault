"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SubmitScoreInput = { gameId: string; name: string; score: number };
export type SubmitScoreResult = { ok: true } | { ok: false; error: string };

const NAME_RE = /^[A-Z0-9]{1,3}$/;
const SCORE_MAX = 9_999_999;
const GENERIC_ERROR = "No se pudo guardar la puntuación. Inténtalo de nuevo.";

export async function submitScore(input: SubmitScoreInput): Promise<SubmitScoreResult> {
  // Accesible por POST directo: no confiar en los tipos del cliente.
  const gameId = typeof input?.gameId === "string" ? input.gameId : "";
  const name = typeof input?.name === "string" ? input.name.trim().toUpperCase() : "";
  const score = input?.score;

  if (!NAME_RE.test(name)) {
    return { ok: false, error: "Las iniciales deben tener 1-3 caracteres (A-Z, 0-9)." };
  }
  if (!Number.isInteger(score) || score < 0 || score > SCORE_MAX) {
    return { ok: false, error: "Puntuación fuera de rango." };
  }
  if (!gameId) {
    return { ok: false, error: "Juego no válido." };
  }

  try {
    const supabase = await createClient();

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id")
      .eq("id", gameId)
      .maybeSingle();
    if (gameError) {
      console.error("[submitScore] Error leyendo el juego:", gameError);
      return { ok: false, error: GENERIC_ERROR };
    }
    if (!game) return { ok: false, error: "Juego no válido." };

    const { error } = await supabase.from("scores").insert({ game_id: gameId, name, score });
    if (error) {
      console.error("[submitScore] Error insertando la puntuación:", error);
      return { ok: false, error: GENERIC_ERROR };
    }
  } catch (err) {
    console.error("[submitScore] Error inesperado:", err);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath("/salon");
  revalidatePath(`/juegos/${gameId}`);
  return { ok: true };
}
