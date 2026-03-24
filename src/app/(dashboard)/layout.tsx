import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/ui/Header";
import type { UserRole } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("users")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  // Fetch farm if user is a farmer
  let farmId: string | undefined;

  if (profile?.role === "farmer") {
    const { data: farm } = await supabase
      .from("farms")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();

    farmId = farm?.id;
  }

  const headerUser = {
    id: user.id,
    email: user.email,
    role: (profile?.role || "farmer") as UserRole,
    full_name: profile?.full_name,
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      <Header user={headerUser} farmId={farmId} />
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
