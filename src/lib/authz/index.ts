import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthFarmer extends AuthUser {
  role: "farmer";
  farmId: string;
}

type AuthResult<T> =
  | { ok: true; user: T }
  | { ok: false; response: NextResponse };

/**
 * Require an authenticated user. Returns the user's id, email, and role.
 */
export async function requireAuth(): Promise<AuthResult<AuthUser>> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const serviceClient = await createServiceClient();
  const { data: profile } = await serviceClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "User profile not found" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email!,
      role: profile.role as UserRole,
    },
  };
}

/**
 * Require an authenticated user with a specific role.
 */
export async function requireRole(
  role: UserRole
): Promise<AuthResult<AuthUser>> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  if (auth.user.role !== role) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden: insufficient role" },
        { status: 403 }
      ),
    };
  }

  return auth;
}

/**
 * Require an authenticated farmer who has an associated farm.
 * Returns the farmId along with the user info.
 */
export async function requireFarmerWithFarm(): Promise<AuthResult<AuthFarmer>> {
  const auth = await requireRole("farmer");
  if (!auth.ok) return auth;

  const serviceClient = await createServiceClient();
  const { data: farm } = await serviceClient
    .from("farms")
    .select("id")
    .eq("owner_user_id", auth.user.id)
    .single();

  if (!farm) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No farm found. Please complete farm setup first." },
        { status: 404 }
      ),
    };
  }

  return {
    ok: true,
    user: {
      ...auth.user,
      role: "farmer" as const,
      farmId: farm.id,
    },
  };
}
