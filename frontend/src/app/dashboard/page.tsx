"use client";

import { useAuth } from "@/lib/store";
import {
  Users,
  Briefcase,
  FileText,
  DollarSign,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Clock,
} from "lucide-react";
import Link from "next/link";

const stats = [
  { label: "Active Clients", value: "—", icon: Users, color: "bg-blue-500", href: "/dashboard/clients" },
  { label: "Open Cases", value: "—", icon: Briefcase, color: "bg-emerald-500", href: "/dashboard/cases" },
  { label: "Documents", value: "—", icon: FileText, color: "bg-violet-500", href: "/dashboard/documents" },
  { label: "Pending Invoices", value: "—", icon: DollarSign, color: "bg-amber-500", href: "/dashboard/billing" },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="animate-fade-in">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-slate-500 mt-1">Here&apos;s what&apos;s happening with your practice today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Upcoming Deadlines
            </h2>
            <Link href="/dashboard/calendar" className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <div className="text-center py-8 text-slate-400">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No upcoming deadlines</p>
            <Link
              href="/dashboard/calendar"
              className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-block"
            >
              Add a deadline
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Recent Activity
            </h2>
          </div>
          <div className="text-center py-8 text-slate-400">
            <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
            <p className="text-xs mt-1">Activity will appear here as you use the platform</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "New Client", href: "/dashboard/clients", icon: Users, color: "text-blue-600 bg-blue-50" },
              { label: "New Case", href: "/dashboard/cases", icon: Briefcase, color: "text-emerald-600 bg-emerald-50" },
              { label: "Draft Document", href: "/dashboard/documents", icon: FileText, color: "text-violet-600 bg-violet-50" },
              { label: "AI Research", href: "/dashboard/research", icon: TrendingUp, color: "text-amber-600 bg-amber-50" },
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
