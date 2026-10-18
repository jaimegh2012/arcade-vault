import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Solo rutas internas: empieza por "/" y no por "//" ni "/\" (evita open redirect).
function safeNext(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  // Proveedor cancelado o redirect mal configurado: sin código o con error.
  if (!code || searchParams.get("error")) {
    return NextResponse.redirect(`${origin}/auth?error=oauth`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth] exchangeCodeForSession:", error);
    return NextResponse.redirect(`${origin}/auth?error=oauth`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
