export type User = { name: string };
export type SavedScoreEntry = { game: string; score: number; name: string; at: number };

export function getUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem("av_user") || "null");
  } catch {
    return null;
  }
}

export function setUser(user: User | null): void {
  try {
    if (user) localStorage.setItem("av_user", JSON.stringify(user));
    else localStorage.removeItem("av_user");
  } catch {
    // localStorage no disponible (SSR u otro entorno restringido)
  }
}

export function saveScore(entry: Omit<SavedScoreEntry, "at">): void {
  try {
    const all: SavedScoreEntry[] = JSON.parse(localStorage.getItem("av_scores") || "[]");
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem("av_scores", JSON.stringify(all));
  } catch {
    // localStorage no disponible (SSR u otro entorno restringido)
  }
}
