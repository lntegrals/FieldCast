import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Sprout, LogIn, LayoutDashboard, ShoppingBasket, Bell, Mic, List } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let userRole: string | null = null;
  if (authUser) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", authUser.id)
      .single();
    userRole = profile?.role ?? null;
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#3A7D44] rounded-lg flex items-center justify-center">
                <Sprout className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-[#2E2E2E]">
                FieldCast
              </span>
            </Link>

            {/* Nav */}
            <nav className="flex items-center gap-1">
              <Link
                href="/listings"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#2E2E2E]/60 hover:text-[#2E2E2E] hover:bg-[#F7F6F2] transition-colors"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Browse</span>
              </Link>

              {authUser ? (
                <>
                  {userRole === "farmer" && (
                    <>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#2E2E2E]/60 hover:text-[#2E2E2E] hover:bg-[#F7F6F2] transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        <span className="hidden sm:inline">Dashboard</span>
                      </Link>
                      <Link
                        href="/record"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#2E2E2E]/60 hover:text-[#2E2E2E] hover:bg-[#F7F6F2] transition-colors"
                      >
                        <Mic className="w-4 h-4" />
                        <span className="hidden sm:inline">Record</span>
                      </Link>
                    </>
                  )}
                  {userRole === "buyer" && (
                    <>
                      <Link
                        href="/subscribe"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#2E2E2E]/60 hover:text-[#2E2E2E] hover:bg-[#F7F6F2] transition-colors"
                      >
                        <Bell className="w-4 h-4" />
                        <span className="hidden sm:inline">Subscriptions</span>
                      </Link>
                      <Link
                        href="/subscribe"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#2E2E2E]/60 hover:text-[#2E2E2E] hover:bg-[#F7F6F2] transition-colors"
                      >
                        <ShoppingBasket className="w-4 h-4" />
                        <span className="hidden sm:inline">My Farms</span>
                      </Link>
                    </>
                  )}
                </>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-[#3A7D44] text-white hover:bg-[#3A7D44]/90 transition-colors shadow-sm"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
