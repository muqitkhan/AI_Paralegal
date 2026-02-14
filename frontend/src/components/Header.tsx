"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Search,
  Users,
  Briefcase,
  FileText,
  LogOut,
  Settings,
  User,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/store";
import { api } from "@/lib/api";

/* ---------- types ---------- */
interface SearchResult {
  id: string;
  label: string;
  sub?: string;
  href: string;
  icon: React.ElementType;
  category: string;
}

/* ---------- component ---------- */
export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  /* --- search state --- */
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  /* --- profile dropdown state --- */
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  /* close dropdowns on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* debounced search across clients, cases, documents */
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const [clients, cases, docs] = await Promise.all([
        api.getClients({ search: q }).catch(() => []),
        api.getCases({ search: q }).catch(() => []),
        api.getDocuments({ search: q }).catch(() => []),
      ]);

      const items: SearchResult[] = [];

      (clients as any[]).slice(0, 5).forEach((c) =>
        items.push({
          id: c.id,
          label: c.name,
          sub: c.email || c.company,
          href: "/dashboard/clients",
          icon: Users,
          category: "Clients",
        })
      );

      (cases as any[]).slice(0, 5).forEach((cs) =>
        items.push({
          id: cs.id,
          label: cs.title,
          sub: cs.case_number || cs.status,
          href: "/dashboard/cases",
          icon: Briefcase,
          category: "Cases",
        })
      );

      (docs as any[]).slice(0, 5).forEach((d) =>
        items.push({
          id: d.id,
          label: d.title,
          sub: d.doc_type,
          href: "/dashboard/documents",
          icon: FileText,
          category: "Documents",
        })
      );

      setResults(items);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  function handleQueryChange(val: string) {
    setQuery(val);
    setShowSearch(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  }

  /* group results by category */
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.category] ||= []).push(r);
    return acc;
  }, {});

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* ---- Search ---- */}
      <div ref={searchRef} className="flex items-center gap-3 flex-1 max-w-xl relative">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => { if (query.trim()) setShowSearch(true); }}
            placeholder="Search clients, cases, documents..."
            className="field pl-10 pr-10"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
          )}
        </div>

        {/* search dropdown */}
        {showSearch && query.trim() && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-80 overflow-y-auto z-50">
            {searching && results.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                Searching...
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                No results found for &ldquo;{query}&rdquo;
              </div>
            ) : (
              Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/80">
                    {cat}
                  </div>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-50 transition-colors"
                      onClick={() => {
                        setShowSearch(false);
                        setQuery("");
                        router.push(item.href);
                      }}
                    >
                      <item.icon className="h-4 w-4 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{item.label}</p>
                        {item.sub && (
                          <p className="text-xs text-slate-400 truncate">{item.sub}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ---- Right side ---- */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
        </button>

        {/* Profile dropdown */}
        {user && (
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setShowProfile((p) => !p)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-700">{user.name}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center text-white font-medium text-sm">
                {user.name?.charAt(0) || "U"}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                {/* user info */}
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>

                {/* menu items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      router.push("/dashboard/settings");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <User className="h-4 w-4 text-slate-400" />
                    Profile Settings
                  </button>
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      router.push("/dashboard/settings");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    Account Settings
                  </button>
                </div>

                {/* sign out */}
                <div className="border-t border-slate-100 py-1">
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      logout();
                      router.push("/");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
