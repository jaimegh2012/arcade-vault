import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "./database.types";

// Subrutas de /auth que siguen accesibles con sesión (el callback intercambia el código
// y nueva-clave se abre con la sesión temporal del enlace de recuperación).
const AUTH_OPEN = ["/auth/callback", "/auth/nueva-clave"];

function isAuthRedirectable(pathname: string) {
  const inAuth = pathname === "/auth" || pathname.startsWith("/auth/");
  return inAuth && !AUTH_OPEN.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refresca la sesión de Supabase en cada petición y redirige `/auth` a `/` si ya hay sesión.
 * Ninguna ruta exige sesión: el modo invitado se mantiene.
 */
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en el entorno.",
    );
  }

  let response = NextResponse.next({ request });

  // No guardar este cliente en una variable global: se crea uno nuevo por petición.
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // No ejecutar código entre createServerClient y getUser(): getUser() es lo que refresca
  // el token; sin él las cookies caducan y el usuario "se desloguea" al azar.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && isAuthRedirectable(request.nextUrl.pathname)) {
    const redirect = NextResponse.redirect(new URL("/", request.url));
    // Conservar las cookies refrescadas en la respuesta de redirección.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    response.headers.forEach((v, k) => {
      if (k.toLowerCase().startsWith("cache-control")) redirect.headers.set(k, v);
    });
    return redirect;
  }

  return response;
}
