"use client";

import { useAuth } from "@/lib/store";
import { api } from "@/lib/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Users,
  Briefcase,
  FileText,
  DollarSign,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Clock,
  MapPin,
  X,
} from "lucide-react";
import Link from "next/link";

const iconMap: Record<string, any> = { FileText, DollarSign, Briefcase, TrendingUp, Clock };

const priorityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function DashboardPage() {
  const { user } = useAuth();

  const [stats, setStats] = useState<any>(null);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isSyncingRef = useRef(false);

  const loadDashboardData = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    try {
      const [s, d, ap, a] = await Promise.all([
        api.getDashboardStats(),
        api.getDashboardDeadlines(),
        api.getDashboardAppointments(),
        api.getDashboardActivity(),
      ]);
      setStats(s);
      setDeadlines(d);
      setAppointments(ap);
      setSelectedAppointment((prev) => {
        if (!ap.length) return null;
        if (!prev) return ap[0];
        return ap.find((item: any) => item.id === prev.id) || ap[0];
      });
      setActivity(a);
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
      isSyncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    const onFocus = () => loadDashboardData();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        loadDashboardData();
      }
    };
    const onOnline = () => loadDashboardData();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    const intervalId = window.setInterval(() => {
      loadDashboardData();
    }, 15000);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.clearInterval(intervalId);
    };
  }, [loadDashboardData]);

  const statCards = [
    { label: "Active Clients", value: stats?.active_clients ?? "—", icon: Users, color: "bg-blue-500", href: "/dashboard/clients" },
    { label: "Open Cases", value: stats?.open_cases ?? "—", icon: Briefcase, color: "bg-emerald-500", href: "/dashboard/cases" },
    { label: "Documents", value: stats?.documents ?? "—", icon: FileText, color: "bg-violet-500", href: "/dashboard/documents" },
    { label: "Pending Invoices", value: stats?.pending_invoices ?? "—", icon: DollarSign, color: "bg-amber-500", href: "/dashboard/billing" },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-slate-500 mt-1">Here&apos;s what&apos;s happening with your practice today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="panel hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">
                  {loading ? <span className="animate-pulse text-slate-300">—</span> : stat.value}
                </p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Revenue Summary */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Link href="/dashboard/billing?focus=all" className="panel hover:shadow-md transition-shadow">
            <p className="text-sm text-slate-500">Total Billed</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              ${stats.total_billed.toLocaleString()}
            </p>
          </Link>
          <Link href="/dashboard/billing?focus=paid" className="panel hover:shadow-md transition-shadow">
            <p className="text-sm text-slate-500">Collected</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              ${stats.total_collected.toLocaleString()}
            </p>
          </Link>
          <Link href="/dashboard/billing?focus=outstanding" className="panel hover:shadow-md transition-shadow">
            <p className="text-sm text-slate-500">Outstanding</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              ${stats.outstanding.toLocaleString()}
            </p>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <div className="panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Upcoming Deadlines
            </h2>
            <Link href="/dashboard/calendar" className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          {deadlines.length === 0 && !loading ? (
            <div className="text-center py-8 text-slate-400">
              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No upcoming deadlines</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deadlines.map((d) => {
                const daysLeft = Math.ceil((new Date(d.due_date).getTime() - Date.now()) / 86400000);
                return (
                  <div key={d.id} className="flex items-start justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{d.title}</p>
                      {d.case_title && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">{d.case_title}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityColors[d.priority]}`}>
                        {d.priority}
                      </span>
                      <span className={`text-xs font-medium ${daysLeft <= 3 ? "text-red-600" : daysLeft <= 7 ? "text-amber-600" : "text-slate-500"}`}>
                        {daysLeft}d
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Appointments */}
        <div className="panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-500" />
              Upcoming Appointments
            </h2>
            <Link href="/dashboard/calendar" className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          {appointments.length === 0 && !loading ? (
            <div className="text-center py-8 text-slate-400">
              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No upcoming appointments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((ap) => {
                const isSelected = selectedAppointment?.id === ap.id;
                return (
                  <button
                    key={ap.id}
                    onClick={() => setSelectedAppointment(ap)}
                    className={`w-full text-left p-3 rounded-lg transition-colors border ${isSelected ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-100 hover:bg-slate-100"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{ap.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {new Date(ap.start_time).toLocaleDateString()} • {new Date(ap.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 shrink-0">
                        {ap.status}
                      </span>
                    </div>
                  </button>
                );
              })}

              {selectedAppointment && (
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-slate-800 truncate">Quick Peek</p>
                    <button onClick={() => setSelectedAppointment(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm font-medium text-slate-800">{selectedAppointment.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(selectedAppointment.start_time).toLocaleDateString()} • {new Date(selectedAppointment.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(selectedAppointment.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {selectedAppointment.client_name && (
                    <p className="text-xs text-slate-600 mt-1">Client: {selectedAppointment.client_name}</p>
                  )}
                  {selectedAppointment.case_title && (
                    <p className="text-xs text-slate-600">Case: {selectedAppointment.case_title}</p>
                  )}
                  {selectedAppointment.location && (
                    <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {selectedAppointment.location}
                    </p>
                  )}
                  {selectedAppointment.notes && (
                    <p className="text-xs text-slate-500 mt-2">{selectedAppointment.notes}</p>
                  )}
                  <div className="mt-3">
                    <Link
                      href={`/dashboard/calendar?tab=appointments&appointment_id=${selectedAppointment.id}`}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Open in Calendar
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="panel p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Recent Activity
            </h2>
          </div>
          {activity.length === 0 && !loading ? (
            <div className="text-center py-8 text-slate-400">
              <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activity.map((a, i) => {
                const Icon = iconMap[a.icon] || Clock;
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate">{a.title}</p>
                      <p className="text-xs text-slate-400">{timeAgo(a.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="panel p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "New Client", href: "/dashboard/clients", icon: Users, color: "text-blue-600 bg-blue-50" },
              { label: "New Case", href: "/dashboard/cases", icon: Briefcase, color: "text-emerald-600 bg-emerald-50" },
              { label: "Draft Document", href: "/dashboard/documents", icon: FileText, color: "text-violet-600 bg-violet-50" },
              { label: "AI Research", href: "/dashboard/research", icon: TrendingUp, color: "text-amber-600 bg-amber-50" },
              { label: "Billing", href: "/dashboard/billing", icon: DollarSign, color: "text-rose-600 bg-rose-50" },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 
                         hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <div className={`p-3 rounded-lg ${action.color}`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-slate-700">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
