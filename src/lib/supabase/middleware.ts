import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Paths that require farmer role. */
const FARMER_PATHS = ["/dashboard", "/record", "/drafts", "/setup-farm"];

/** Paths that require any authenticated user. */
const AUTH_REQUIRED_PATHS = [...FARMER_PATHS, "/subscribe"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Check if the path requires authentication
  const needsAuth = AUTH_REQUIRED_PATHS.some((p) => pathname.startsWith(p));

  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Check role-gated paths
  if (user && FARMER_PATHS.some((p) => pathname.startsWith(p))) {
    // Fetch user role from public.users via service role to avoid RLS issues
    // We use a lightweight check here
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile && profile.role !== "farmer") {
      // Buyer trying to access farmer paths — redirect to listings
      const url = request.nextUrl.clone();
      url.pathname = "/listings";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
