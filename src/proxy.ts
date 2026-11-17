import { type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

/**
 * Next.js proxy (formerly middleware) — refreshes the Supabase Auth session
 * on matched requests. Runs before every page load to keep the Supabase
 * session cookie fresh.
 *
 * Note: This is separate from the LMS's custom auth (Prisma-based session in
 * /api/auth/*). Both auth systems coexist without conflict — Supabase manages
 * `sb-*` cookies while the LMS manages its own session cookie.
 */
export async function proxy(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request);

  // Refresh the Supabase session (no-op if not signed in via Supabase Auth)
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static asset extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
