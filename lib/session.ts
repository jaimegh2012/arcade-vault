import { useSyncExternalStore } from "react";

export type User = { name: string };
export type SavedScoreEntry = { game: string; score: number; name: string; at: number };

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

// Cachea por el string crudo de localStorage para que useSyncExternalStore
// reciba una referencia estable entre llamadas cuando el valor no cambió.
let cachedRaw: string | null = null;
let cachedUser: User | null = null;

function readUserSnapshot(): User | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem("av_user");
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedUser = raw ? JSON.parse(raw) : null;
    } catch {
      cachedUser = null;
    }
  }
  return cachedUser;
}

function readUserServerSnapshot(): User | null {
  return null;
}

export function getUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem("av_user") || "null");
  } catch {
    return null;
  }
}

export function useUser(): User | null {
  return useSyncExternalStore(subscribe, readUserSnapshot, readUserServerSnapshot);
}

export function setUser(user: User | null): void {
  try {
    if (user) localStorage.setItem("av_user", JSON.stringify(user));
    else localStorage.removeItem("av_user");
  } catch {
    // localStorage no disponible (SSR u otro entorno restringido)
  }
  notify();
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
