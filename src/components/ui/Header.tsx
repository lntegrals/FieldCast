"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Sprout, Menu, X, LogOut, Mic, LayoutDashboard, ShoppingBasket, List, Bell } from "lucide-react";
import type { UserRole } from "@/types/database";

interface HeaderProps {
  user: {
    id: string;
    email?: string;
    role: UserRole;
    full_name?: string;
  };
  farmId?: string;
}

interface NavLink {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export default function Header({ user }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const farmerLinks: NavLink[] = [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Record", href: "/record", icon: <Mic className="w-4 h-4" /> },
    { label: "Listings", href: "/listings", icon: <List className="w-4 h-4" /> },
  ];

  const buyerLinks: NavLink[] = [
    { label: "Browse", href: "/listings", icon: <ShoppingBasket className="w-4 h-4" /> },
    { label: "Subscriptions", href: "/subscribe", icon: <Bell className="w-4 h-4" /> },
  ];

  const navLinks = user.role === "farmer" ? farmerLinks : buyerLinks;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href={user.role === "farmer" ? "/dashboard" : "/listings"} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#3A7D44] rounded-lg flex items-center justify-center">
              <Sprout className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-[#2E2E2E] hidden sm:block">
              FieldCast
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#2E2E2E]/60 hover:text-[#2E2E2E] hover:bg-[#F7F6F2] transition-colors"
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Right */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-sm text-[#2E2E2E]/50">
              {user.full_name || user.email}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#2E2E2E]/60 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg text-[#2E2E2E]/60 hover:bg-[#F7F6F2] transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-200 ease-in-out border-t border-gray-100",
          menuOpen ? "max-h-80" : "max-h-0 border-t-0"
        )}
      >
        <div className="px-4 py-3 space-y-1 bg-white">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-[#2E2E2E]/70 hover:text-[#2E2E2E] hover:bg-[#F7F6F2] transition-colors"
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
          <div className="border-t border-gray-100 pt-2 mt-2">
            <div className="px-3 py-2 text-xs text-[#2E2E2E]/40">
              {user.full_name || user.email}
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
