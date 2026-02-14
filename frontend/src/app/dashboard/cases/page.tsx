"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Briefcase, Plus, Search, Users, FileText, Clock, CalendarDays, Edit2, Trash2, X, Hash, Gavel, Sparkles, Loader2, Download } from "lucide-react";
import toast from "react-hot-toast";
import InlineAutocomplete from "@/components/InlineAutocomplete";
import FileImport from "@/components/FileImport";
import { downloadTextFile, caseToText } from "@/lib/download";

const PAGE_SIZE = 25;

const caseTypes = ["civil", "criminal", "corporate", "family", "real_estate", "immigration", "intellectual_property", "labor", "tax", "other"];
const caseStatuses = ["open", "in_progress", "pending", "closed", "archived"];

function generateCaseNumber() {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `CASE-${year}-${seq}`;
}

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreCases, setHasMoreCases] = useState(true);
  const [syncingStatus, setSyncingStatus] = useState(false);
  const [generatingDeadlines, setGeneratingDeadlines] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [form, setForm] = useState({
    client_id: "",
    title: "",
    case_number: "",
    case_type: "other",
    description: "",
    court: "",
    judge: "",
    opposing_counsel: "",
    filing_date: "",
    estimated_value: "",
  });

  useEffect(() => { loadData(true); }, []);

  async function loadData(reset = true) {
    const offset = reset ? 0 : cases.length;
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const caseParams: { search?: string; limit: number; offset: number } = {
        limit: PAGE_SIZE,
        offset,
      };
      if (search.trim()) caseParams.search = search.trim();

      const [cs, cl, docs, dls, te] = await Promise.all([
        api.getCases(caseParams).catch(() => []),
        reset ? api.getClients().catch(() => []) : Promise.resolve(clients),
        reset ? api.getDocuments().catch(() => []) : Promise.resolve(documents),
        reset ? api.getDeadlines().catch(() => []) : Promise.resolve(deadlines),
        reset ? api.getTimeEntries().catch(() => []) : Promise.resolve(timeEntries),
      ]);

      setCases(prev => (reset ? cs : [...prev, ...cs]));
      if (reset) {
        setClients(cl as any[]);
        setDocuments(docs as any[]);
        setDeadlines(dls as any[]);
        setTimeEntries(te as any[]);
      }
      setHasMoreCases(cs.length === PAGE_SIZE);
    } catch (e) { console.error(e); }
    finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function openNewForm() {
    setEditingId(null);
    setForm({ client_id: "", title: "", case_number: generateCaseNumber(), case_type: "other", description: "", court: "", judge: "", opposing_counsel: "", filing_date: "", estimated_value: "" });
    setShowForm(true);
  }

  function startEdit(c: any) {
    setEditingId(c.id);
    setForm({
      client_id: c.client_id || "",
      title: c.title || "",
      case_number: c.case_number || "",
      case_type: c.case_type || "other",
      description: c.description || "",
      court: c.court || "",
      judge: c.judge || "",
      opposing_counsel: c.opposing_counsel || "",
      filing_date: c.filing_date ? c.filing_date.split("T")[0] : "",
      estimated_value: c.estimated_value || "",
    });
    setShowForm(true);
  }

  async function handleAutoFill() {
    setAutoFilling(true);
    try {
      const clientName = form.client_id ? clients.find(c => c.id === form.client_id)?.name : "";
      const ctx = clientName ? `Client: ${clientName}, case type: ${form.case_type}` : `case type: ${form.case_type}`;
      const result = await api.aiAutoFill("case", ["title", "description", "court", "judge", "opposing_counsel", "estimated_value"], form, ctx);
      setForm(prev => ({
        ...prev,
        title: result.title || prev.title,
        description: result.description || prev.description,
        court: result.court || prev.court,
        judge: result.judge || prev.judge,
        opposing_counsel: result.opposing_counsel || prev.opposing_counsel,
        estimated_value: result.estimated_value ? String(result.estimated_value) : prev.estimated_value,
        filing_date: result.filing_date || prev.filing_date,
      }));
      toast.success("Form auto-filled by AI");
    } catch (err: any) { toast.error(err.message || "Auto-fill failed"); }
    finally { setAutoFilling(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = { ...form };
    if (payload.estimated_value) payload.estimated_value = parseFloat(payload.estimated_value);
    else delete payload.estimated_value;
    if (!payload.filing_date) delete payload.filing_date;
    try {
      if (editingId) {
        await api.updateCase(editingId, payload);
        toast.success("Case updated");
        setEditingId(null);
      } else {
        await api.createCase(payload);
        toast.success("Case created");
      }
      setShowForm(false);
      loadData(true);
    } catch (err: any) { toast.error(err.message || "Failed"); }
  }

  async function quickStatusChange(id: string, newStatus: string) {
    try {
      await api.updateCase(id, { status: newStatus });
      toast.success(`Status → ${newStatus.replace("_", " ")}`);
      loadData(true);
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this case and all related data?")) return;
    try { await api.deleteCase(id); toast.success("Case deleted"); loadData(true); } catch (err: any) { toast.error(err.message); }
  }

  async function handleAutoStatusSync() {
    setSyncingStatus(true);
    try {
      const result = await api.syncCaseStatuses();
      toast.success(`Auto status sync complete: ${result.updated} updated`);
      loadData(true);
    } catch (err: any) {
      toast.error(err.message || "Auto status sync failed");
    } finally {
      setSyncingStatus(false);
    }
  }

  async function handleAutoDeadlineGeneration() {
    setGeneratingDeadlines(true);
    try {
      const result = await api.generateCaseDeadlines();
      toast.success(`Auto deadlines: ${result.created} created across ${result.cases_processed} cases`);
      loadData(true);
    } catch (err: any) {
      toast.error(err.message || "Auto deadline generation failed");
    } finally {
      setGeneratingDeadlines(false);
    }
  }

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || "—";
  const getDocCount = (caseId: string) => documents.filter(d => d.case_id === caseId).length;
  const getDeadlineCount = (caseId: string) => deadlines.filter(d => d.case_id === caseId).length;
  const getTimeHours = (caseId: string) => timeEntries.filter(t => t.case_id === caseId).reduce((s, t) => s + Number(t.hours || 0), 0);

  const statusColors: Record<string, string> = {
    open: "bg-slate-100 text-slate-700",
    in_progress: "bg-slate-200 text-slate-700",
    pending: "bg-slate-200 text-slate-700",
    closed: "bg-slate-100 text-slate-600",
    archived: "bg-slate-100 text-slate-400",
  };

  // Stats
  const openCount = cases.filter(c => c.status === "open" || c.status === "in_progress").length;
  const pendingCount = cases.filter(c => c.status === "pending").length;
  const closedCount = cases.filter(c => c.status === "closed" || c.status === "archived").length;

  // Filter
  let filtered = cases;
  if (filterStatus) filtered = filtered.filter(c => c.status === filterStatus);
  if (filterClient) filtered = filtered.filter(c => c.client_id === filterClient);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cases</h1>
          <p className="text-slate-500 mt-1">Track and manage your legal cases</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoDeadlineGeneration}
            disabled={generatingDeadlines}
            className="btn-base btn-md btn-secondary"
          >
            {generatingDeadlines ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />} Auto Deadlines
          </button>
          <button
            onClick={handleAutoStatusSync}
            disabled={syncingStatus}
            className="btn-base btn-md btn-secondary"
          >
            {syncingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Auto Status
          </button>
          <FileImport
            onImport={(data) => api.importCases(data).then((r) => { loadData(); return r; })}
            sampleFields={["title", "client_id", "case_number", "case_type", "description", "court", "judge", "status"]}
            entityName="case"
          />
          <button onClick={openNewForm}
            className="btn-base btn-md btn-primary">
            <Plus className="h-4 w-4" /> New Case
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="panel">
          <p className="text-sm text-slate-500">Total Cases</p>
          <p className="text-2xl font-bold text-slate-800">{cases.length}</p>
        </div>
        <div className="panel border-slate-300">
          <p className="text-sm text-slate-600">Active</p>
          <p className="text-2xl font-bold text-slate-700">{openCount}</p>
        </div>
        <div className="panel border-slate-300">
          <p className="text-sm text-slate-600">Pending</p>
          <p className="text-2xl font-bold text-slate-700">{pendingCount}</p>
        </div>
        <div className="panel">
          <p className="text-sm text-slate-500">Closed</p>
          <p className="text-2xl font-bold text-slate-400">{closedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search cases..." value={search}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadData(true)}
            className="field pl-10 pr-4" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="field min-w-[160px]">
          <option value="">All Statuses</option>
          {caseStatuses.map((s) => (<option key={s} value={s}>{s.replace("_", " ")}</option>))}
        </select>
        <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}
          className="field min-w-[160px]">
          <option value="">All Clients</option>
          {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
      </div>

      {/* Form */}
      {showForm && (
        <div className="panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">{editingId ? "Edit Case" : "New Case"}</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
              <select required value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                className="field">
                <option value="">Select Client</option>
                {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Case Title *</label>
              <InlineAutocomplete required value={form.title} onChange={(v) => setForm({ ...form, title: v })} fieldType="case_title"
                placeholder="e.g. Smith v. Jones"
                className="field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Case Number</label>
              <div className="flex gap-2">
                <input value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <button type="button" onClick={() => setForm({ ...form, case_number: generateCaseNumber() })}
                  className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200"><Hash className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Case Type</label>
              <select value={form.case_type} onChange={(e) => setForm({ ...form, case_type: e.target.value })}
                className="field">
                {caseTypes.map((t) => (<option key={t} value={t}>{t.replace("_", " ")}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Court</label>
              <InlineAutocomplete value={form.court} onChange={(v) => setForm({ ...form, court: v })} fieldType="court"
                placeholder="e.g. Superior Court of California"
                className="field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Judge</label>
              <InlineAutocomplete value={form.judge} onChange={(v) => setForm({ ...form, judge: v })} fieldType="judge"
                placeholder="e.g. Hon. Jane Smith"
                className="field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Opposing Counsel</label>
              <InlineAutocomplete value={form.opposing_counsel} onChange={(v) => setForm({ ...form, opposing_counsel: v })} fieldType="client_name"
                context="opposing counsel name"
                className="field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Filing Date</label>
              <input type="date" value={form.filing_date} onChange={(e) => setForm({ ...form, filing_date: e.target.value })}
                className="field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Value ($)</label>
              <input type="number" step="0.01" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })}
                className="field" />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center justify-between text-sm font-medium text-slate-700 mb-1">
                Description
                <button type="button" onClick={handleAutoFill} disabled={autoFilling}
                  className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-medium hover:bg-slate-200 disabled:opacity-50 border border-slate-200 transition-colors">
                  {autoFilling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  AI Auto-Fill All
                </button>
              </label>
              <InlineAutocomplete as="textarea" value={form.description} onChange={(v) => setForm({ ...form, description: v })} fieldType="description"
                context="legal case description" rows={2}
                className="field" />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="btn-base btn-sm btn-primary">
                {editingId ? "Update Case" : "Create Case"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
                className="btn-base btn-sm btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Cases List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="panel text-center py-16">
          <Briefcase className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-medium text-slate-600">No cases found</h3>
          <p className="text-slate-400 mt-1">{filterStatus || filterClient ? "Try different filters" : "Create a case to start tracking"}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((c) => {
            const docCount = getDocCount(c.id);
            const dlCount = getDeadlineCount(c.id);
            const hours = getTimeHours(c.id);
            return (
              <div key={c.id} className="panel defer-render hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-slate-800">{c.title}</h3>
                      <select value={c.status} onChange={(e) => quickStatusChange(c.id, e.target.value)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${statusColors[c.status]}`}>
                        {caseStatuses.map(s => (<option key={s} value={s}>{s.replace("_", " ")}</option>))}
                      </select>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        {c.case_type.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {getClientName(c.client_id)}</span>
                      {c.case_number && <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" /> {c.case_number}</span>}
                      {c.court && <span className="flex items-center gap-1"><Gavel className="h-3.5 w-3.5" /> {c.court}</span>}
                      {c.judge && <span>Judge: {c.judge}</span>}
                    </div>
                    {/* Related data badges */}
                    <div className="flex gap-3 mt-2">
                      {docCount > 0 && (
                        <span className="text-xs text-slate-600 flex items-center gap-1"><FileText className="h-3 w-3" /> {docCount} doc{docCount !== 1 ? "s" : ""}</span>
                      )}
                      {dlCount > 0 && (
                        <span className="text-xs text-slate-600 flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {dlCount} deadline{dlCount !== 1 ? "s" : ""}</span>
                      )}
                      {hours > 0 && (
                        <span className="text-xs text-slate-600 flex items-center gap-1"><Clock className="h-3 w-3" /> {hours.toFixed(1)}h billed</span>
                      )}
                      {c.estimated_value && (
                        <span className="text-xs text-slate-500">${Number(c.estimated_value).toLocaleString()}</span>
                      )}
                    </div>
                    {c.description && <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">{c.description}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => downloadTextFile(`${c.title || "case"}.txt`, caseToText(c, getClientName(c.client_id)))} className="p-1.5 text-slate-400 hover:text-emerald-500" title="Download"><Download className="h-4 w-4" /></button>
                    <button onClick={() => startEdit(c)} className="p-1.5 text-slate-400 hover:text-blue-500" title="Edit"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 text-slate-400 hover:text-red-500" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
          {hasMoreCases && (
            <div className="flex justify-center pt-1">
              <button
                onClick={() => loadData(false)}
                disabled={loadingMore}
                className="btn-base btn-sm btn-secondary"
              >
                {loadingMore ? "Loading..." : "Load more cases"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
