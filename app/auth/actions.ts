"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"username" | "email" | "password", string>>;
};

export type OAuthProvider = "google" | "github";

const USERNAME_RE = /^[A-Za-z0-9_]{3,12}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 254;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72; // límite de bcrypt en Supabase

const GENERIC_ERROR = "No se pudo completar la operación. Inténtalo de nuevo más tarde.";

// Contraseñas sin trim: los espacios cuentan. El resto de campos sí se recortan.
function field(formData: FormData, key: string, trim = true) {
  const v = formData.get(key);
  if (typeof v !== "string") return "";
  return trim ? v.trim() : v;
}

function validatePassword(password: string) {
  if (password.length < PASSWORD_MIN) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  }
  if (password.length > PASSWORD_MAX) {
    return `La contraseña no puede superar ${PASSWORD_MAX} caracteres.`;
  }
  return undefined;
}

function validateEmail(email: string) {
  if (!email || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) {
    return "Correo electrónico inválido.";
  }
  return undefined;
}

// URL base para los retornos de OAuth / reset, sin variable de entorno nueva.
async function getOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const username = field(formData, "username");
  const email = field(formData, "email");
  const password = field(formData, "password", false);

  const fieldErrors: NonNullable<AuthState["fieldErrors"]> = {};
  if (!USERNAME_RE.test(username)) {
    fieldErrors.username = "3 a 12 caracteres: letras, números o guion bajo.";
  }
  const emailError = validateEmail(email);
  if (emailError) fieldErrors.email = emailError;
  const passwordError = validatePassword(password);
  if (passwordError) fieldErrors.password = passwordError;
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const supabase = await createClient();

  // Unicidad case-insensitive. En ilike "_" y "%" son comodines: se escapan.
  const pattern = username.replace(/[\\%_]/g, "\\$&");
  const { data: taken, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", pattern)
    .limit(1);
  if (lookupError) {
    console.error("[auth] Error comprobando username:", lookupError);
    return { ok: false, error: GENERIC_ERROR };
  }
  if (taken && taken.length > 0) {
    return { ok: false, fieldErrors: { username: "Ese usuario ya está en uso." } };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return { ok: false, fieldErrors: { email: "Ese correo ya está registrado." } };
    }
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return { ok: false, error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." };
    }
    if (error.code === "email_address_invalid") {
      return { ok: false, fieldErrors: { email: "Correo electrónico inválido." } };
    }
    if (error.code === "weak_password") {
      return { ok: false, fieldErrors: { password: "Contraseña demasiado débil." } };
    }
    console.error("[auth] signUp:", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  // Con "Confirm email" activado Supabase no devuelve sesión: el spec lo exige desactivado.
  if (!data.session) {
    console.error("[auth] signUp sin sesión: ¿'Confirm email' sigue activado en Supabase?");
    return { ok: false, error: GENERIC_ERROR };
  }

  redirect("/");
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = field(formData, "email");
  const password = field(formData, "password", false);

  if (!email || !password) {
    return { ok: false, error: "Credenciales inválidas." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Mismo mensaje para email inexistente y contraseña errónea.
    if (error.code === "invalid_credentials" || error.status === 400) {
      return { ok: false, error: "Credenciales inválidas." };
    }
    console.error("[auth] signIn:", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) console.error("[auth] signOut:", error);
}

export async function signInWithOAuth(provider: OAuthProvider): Promise<AuthState> {
  if (provider !== "google" && provider !== "github") {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${await getOrigin()}/auth/callback` },
  });

  if (error || !data.url) {
    console.error("[auth] signInWithOAuth:", error);
    return { ok: false, error: "No se pudo iniciar sesión con el proveedor." };
  }

  redirect(data.url);
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = field(formData, "email");
  const emailError = validateEmail(email);
  if (emailError) return { ok: false, fieldErrors: { email: emailError } };

  const supabase = await createClient();
  const next = encodeURIComponent("/auth/nueva-clave");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await getOrigin()}/auth/callback?next=${next}`,
  });
  if (error) console.error("[auth] resetPasswordForEmail:", error);

  // Respuesta genérica siempre: no revela si la cuenta existe.
  return { ok: true };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = field(formData, "password", false);
  const passwordError = validatePassword(password);
  if (passwordError) return { ok: false, fieldErrors: { password: passwordError } };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "El enlace expiró. Solicita uno nuevo desde Iniciar sesión." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") {
      return { ok: false, fieldErrors: { password: "Usa una contraseña distinta a la anterior." } };
    }
    if (error.code === "weak_password") {
      return { ok: false, fieldErrors: { password: "Contraseña demasiado débil." } };
    }
    console.error("[auth] updatePassword:", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  redirect("/");
}
