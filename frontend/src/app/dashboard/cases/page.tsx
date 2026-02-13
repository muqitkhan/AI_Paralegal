"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Briefcase, Plus, Search } from "lucide-react";
import toast from "react-hot-toast";

const caseTypes = ["civil", "criminal", "corporate", "family", "real_estate", "immigration", "intellectual_property", "labor", "tax", "other"];
const caseStatuses = ["open", "in_progress", "pending", "closed", "archived"];

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [form, setForm] = useState({
    client_id: "",
    title: "",
    case_number: "",
    case_type: "other",
    description: "",
    court: "",
    judge: "",
    opposing_counsel: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [casesData, clientsData] = await Promise.all([
        api.getCases(search ? { search } : filterStatus ? { status: filterStatus } : undefined),
        api.getClients(),
      ]);
      setCases(casesData);
      setClients(clientsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createCase(form);
      toast.success("Case created successfully");
      setShowForm(false);
      setForm({ client_id: "", title: "", case_number: "", case_type: "other", description: "", court: "", judge: "", opposing_counsel: "" });
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create case");
    }
  }

  const statusColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-700",
    pending: "bg-purple-100 text-purple-700",
    closed: "bg-slate-100 text-slate-600",
    archived: "bg-slate-100 text-slate-400",
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cases</h1>
          <p className="text-slate-500 mt-1">Track and manage your legal cases</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          <Plus className="h-4 w-4" />
          New Case
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadData()}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); }}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {caseStatuses.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      {/* New Case Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">New Case</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
              <select
                required
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Select Client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Case Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Case Number</label>
              <input
                value={form.case_number}
                onChange={(e) => setForm({ ...form, case_number: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Case Type</label>
              <select
                value={form.case_type}
                onChange={(e) => setForm({ ...form, case_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {caseTypes.map((t) => (
                  <option key={t} value={t}>{t.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Court</label>
              <input
                value={form.court}
                onChange={(e) => setForm({ ...form, court: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Judge</label>
              <input
                value={form.judge}
                onChange={(e) => setForm({ ...form, judge: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Create Case
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cases List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : cases.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Briefcase className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-medium text-slate-600">No cases yet</h3>
          <p className="text-slate-400 mt-1">Create a case to start tracking</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {cases.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-slate-800">{c.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status]}`}>
                      {c.status.replace("_", " ")}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      {c.case_type.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-2 text-sm text-slate-500">
                    {c.case_number && <span>#{c.case_number}</span>}
                    {c.court && <span>{c.court}</span>}
                    {c.judge && <span>Judge: {c.judge}</span>}
                  </div>
                  {c.description && (
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">{c.description}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
