import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedRole = searchParams.get("role") || "buyer";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const response = NextResponse.redirect(origin);
  const cookieStore = request.cookies;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const user = data.session.user;

  try {
    const serviceClient = await createServiceClient();

    // Check if user profile already exists
    const { data: existingUser } = await serviceClient
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    let effectiveRole: string;

    if (!existingUser) {
      // First-time user: create profile with requested role
      await serviceClient.from("users").insert({
        id: user.id,
        email: user.email!,
        full_name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User",
        role: requestedRole,
      });
      effectiveRole = requestedRole;
    } else {
      // Existing user: role is immutable. Use stored role.
      // This prevents role escalation via URL parameter tampering.
      effectiveRole = existingUser.role;
    }

    // Redirect based on effective role
    if (effectiveRole === "farmer") {
      const { data: existingFarm } = await serviceClient
        .from("farms")
        .select("id")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (!existingFarm) {
        return overrideRedirect(response, `${origin}/setup-farm`);
      }

      return overrideRedirect(response, `${origin}/dashboard`);
    }

    return overrideRedirect(response, `${origin}/listings`);
  } catch (err) {
    console.error("Post-auth setup error:", err);
    const redirectTo = requestedRole === "buyer" ? "/listings" : "/dashboard";
    return overrideRedirect(response, `${origin}${redirectTo}`);
  }
}

function overrideRedirect(response: NextResponse, url: string) {
  const redirectResponse = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value);
  });
  return redirectResponse;
}
