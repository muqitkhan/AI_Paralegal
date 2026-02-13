"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  DollarSign,
  Calendar,
  Search,
  Scale,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/store";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/clients", icon: Users, label: "Clients" },
  { href: "/dashboard/cases", icon: Briefcase, label: "Cases" },
  { href: "/dashboard/documents", icon: FileText, label: "Documents" },
  { href: "/dashboard/billing", icon: DollarSign, label: "Billing" },
  { href: "/dashboard/calendar", icon: Calendar, label: "Calendar" },
  { href: "/dashboard/research", icon: Search, label: "AI Research" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col min-h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700/50">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Scale className="h-7 w-7 text-blue-400" />
          <span className="text-lg font-bold">AI Paralegal</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-slate-700/50">
        <button
          onClick={() => { logout(); router.push("/"); }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                     text-slate-400 hover:bg-slate-800 hover:text-white transition-all w-full"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
