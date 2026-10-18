import { useSyncExternalStore } from "react";

import { createClient } from "@/lib/supabase/client";

// `name` es el username en mayúsculas (así lo muestran la nav y las iniciales del game over).
export type User = { name: string };

const listeners = new Set<() => void>();

// Referencia estable para useSyncExternalStore: solo cambia si cambia el nombre.
let cachedUser: User | null = null;
let started = false;

function setCachedUser(name: string | null) {
  if ((cachedUser?.name ?? null) === name) return;
  cachedUser = name ? { name } : null;
  listeners.forEach((listener) => listener());
}

async function loadProfile(userId: string) {
  const { data, error } = await createClient()
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  if (error) console.error("[session] Error leyendo profiles:", error);
  setCachedUser(data?.username ? data.username.toUpperCase() : null);
}

// Se arranca una sola vez, en el primer subscribe (solo cliente).
function start() {
  if (started) return;
  started = true;

  // La sesión simulada del prototipo ya no existe.
  try {
    localStorage.removeItem("av_user");
  } catch {
    // localStorage no disponible
  }

  createClient().auth.onAuthStateChange((_event, session) => {
    if (!session) {
      setCachedUser(null);
      return;
    }
    // Fuera del callback: llamar a Supabase dentro de él puede bloquear el cliente.
    setTimeout(() => void loadProfile(session.user.id), 0);
  });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readUserSnapshot(): User | null {
  return cachedUser;
}

function readUserServerSnapshot(): User | null {
  return null;
}

export function useUser(): User | null {
  return useSyncExternalStore(subscribe, readUserSnapshot, readUserServerSnapshot);
}
