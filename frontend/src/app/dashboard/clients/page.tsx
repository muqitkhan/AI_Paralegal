"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Users, Plus, Search, Phone, Mail, Building2, MoreHorizontal, Briefcase, FileText, Edit2, X, Trash2, Sparkles, Loader2, Download } from "lucide-react";
import toast from "react-hot-toast";
import InlineAutocomplete from "@/components/InlineAutocomplete";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import FileImport from "@/components/FileImport";
import { downloadTextFile } from "@/lib/download";

const PAGE_SIZE = 25;

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreClients, setHasMoreClients] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    company: "",
    notes: "",
    status: "active",
  });

  useEffect(() => { loadData(true); }, []);

  async function loadData(reset = true) {
    const offset = reset ? 0 : clients.length;
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const clientParams: { search?: string; limit: number; offset: number } = {
        limit: PAGE_SIZE,
        offset,
      };
      if (search.trim()) clientParams.search = search.trim();

      const [cls, cs, docs, inv] = await Promise.all([
        api.getClients(clientParams),
        reset ? api.getCases() : Promise.resolve(cases),
        reset ? api.getDocuments() : Promise.resolve(documents),
        reset ? api.getInvoices() : Promise.resolve(invoices),
      ]);

      setClients(prev => (reset ? cls : [...prev, ...cls]));
      if (reset) {
        setCases(cs as any[]);
        setDocuments(docs as any[]);
        setInvoices(inv as any[]);
      }
      setHasMoreClients(cls.length === PAGE_SIZE);
    } catch (e) { console.error(e); }
    finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function handleAutoFill() {
    setAutoFilling(true);
    try {
      const result = await api.aiAutoFill("client", ["name", "email", "phone", "address", "company", "notes"], form);
      setForm(prev => ({
        ...prev,
        name: result.name || prev.name,
        email: result.email || prev.email,
        phone: result.phone || prev.phone,
        address: result.address || prev.address,
        company: result.company || prev.company,
        notes: result.notes || prev.notes,
      }));
      toast.success("Form auto-filled by AI");
    } catch (err: any) { toast.error(err.message || "Auto-fill failed"); }
    finally { setAutoFilling(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        await api.updateClient(editingId, form);
        toast.success("Client updated");
        setEditingId(null);
      } else {
        await api.createClient(form);
        toast.success("Client created");
      }
      setShowForm(false);
      setForm({ name: "", email: "", phone: "", address: "", company: "", notes: "", status: "active" });
      loadData(true);
    } catch (err: any) { toast.error(err.message || "Failed"); }
  }

  function startEdit(client: any) {
    setEditingId(client.id);
    setForm({
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      company: client.company || "",
      notes: client.notes || "",
      status: client.status || "active",
    });
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this client? This will also delete associated cases.")) return;
    try {
      await api.deleteClient(id);
      toast.success("Client deleted");
      loadData(true);
    } catch (err: any) { toast.error(err.message); }
  }

  async function quickStatusChange(id: string, newStatus: string) {
    try {
      await api.updateClient(id, { status: newStatus });
      toast.success(`Status changed to ${newStatus}`);
      loadData(true);
    } catch (err: any) { toast.error(err.message); }
  }

  const statusColors: Record<string, string> = {
    active: "bg-slate-100 text-slate-700",
    inactive: "bg-slate-100 text-slate-600",
    prospective: "bg-slate-200 text-slate-700",
  };

  // Stats
  const activeCount = clients.filter(c => c.status === "active").length;
  const prospectiveCount = clients.filter(c => c.status === "prospective").length;
  const inactiveCount = clients.filter(c => c.status === "inactive").length;

  // Get related data counts per client
  const getCaseCount = (clientId: string) => cases.filter(c => c.client_id === clientId).length;
  const getOpenCaseCount = (clientId: string) => cases.filter(c => c.client_id === clientId && c.status !== "closed" && c.status !== "archived").length;
  const getClientRevenue = (clientId: string) => invoices.filter(i => i.client_id === clientId && i.status === "paid").reduce((s, i) => s + Number(i.total), 0);

  // Filter
  const filteredClients = filterStatus === "all" ? clients : clients.filter(c => c.status === filterStatus);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clients</h1>
          <p className="text-slate-500 mt-1">Manage your client roster</p>
        </div>
        <div className="flex items-center gap-2">
          <FileImport
            onImport={(data) => api.importClients(data).then((r) => { loadData(); return r; })}
            sampleFields={["name", "email", "phone", "company", "address", "status", "notes"]}
            entityName="client"
          />
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: "", email: "", phone: "", address: "", company: "", notes: "", status: "active" }); }}
            className="btn-base btn-md btn-primary"
          >
            <Plus className="h-4 w-4" />
            New Client
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="panel">
          <p className="text-sm text-slate-500">Total Clients</p>
          <p className="text-2xl font-bold text-slate-800">{clients.length}</p>
        </div>
        <div className="panel border-slate-300">
          <p className="text-sm text-slate-600">Active</p>
          <p className="text-2xl font-bold text-slate-700">{activeCount}</p>
        </div>
        <div className="panel border-slate-300">
          <p className="text-sm text-slate-600">Prospective</p>
          <p className="text-2xl font-bold text-slate-700">{prospectiveCount}</p>
        </div>
        <div className="panel">
          <p className="text-sm text-slate-500">Inactive</p>
          <p className="text-2xl font-bold text-slate-400">{inactiveCount}</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadData(true)}
            className="field pl-10 pr-4"
          />
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {["all", "active", "prospective", "inactive"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterStatus === s ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">{editingId ? "Edit Client" : "New Client"}</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <InlineAutocomplete required value={form.name} onChange={(v) => setForm({ ...form, name: v })} fieldType="client_name"
                placeholder="Client name"
                className="field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
              <InlineAutocomplete value={form.company} onChange={(v) => setForm({ ...form, company: v })} fieldType="company_name"
                placeholder="Company name"
                className="field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="field">
                <option value="active">Active</option>
                <option value="prospective">Prospective</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <AddressAutocomplete value={form.address} onChange={(v) => setForm({ ...form, address: v })}
                placeholder="123 Main St, City, State ZIP"
                className="field" />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center justify-between text-sm font-medium text-slate-700 mb-1">
                Notes
                <button type="button" onClick={handleAutoFill} disabled={autoFilling}
                  className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-medium hover:bg-slate-200 disabled:opacity-50 border border-slate-200 transition-colors">
                  {autoFilling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  AI Auto-Fill All
                </button>
              </label>
              <InlineAutocomplete as="textarea" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} fieldType="description"
                context="client notes for a law firm"
                placeholder="Notes about the client..."
                rows={2}
                className="field" />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="btn-base btn-sm btn-primary">
                {editingId ? "Update Client" : "Create Client"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
                className="btn-base btn-sm btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Client List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : filteredClients.length === 0 ? (
        <div className="panel text-center py-16">
          <Users className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-medium text-slate-600">No clients found</h3>
          <p className="text-slate-400 mt-1">
            {filterStatus !== "all" ? "Try a different filter" : "Add your first client to get started"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredClients.map((client) => {
            const caseCount = getCaseCount(client.id);
            const openCases = getOpenCaseCount(client.id);
            const revenue = getClientRevenue(client.id);
            return (
              <div key={client.id} className="panel defer-render hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-[15px] font-semibold text-slate-800">{client.name}</h3>
                      <select
                        value={client.status}
                        onChange={(e) => quickStatusChange(client.id, e.target.value)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${statusColors[client.status]}`}
                      >
                        <option value="active">active</option>
                        <option value="prospective">prospective</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
                      {client.email && (
                        <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {client.email}</span>
                      )}
                      {client.phone && (
                        <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {client.phone}</span>
                      )}
                      {client.company && (
                        <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {client.company}</span>
                      )}
                    </div>
                    {/* Case/revenue stats */}
                    <div className="flex gap-4 mt-2">
                      {caseCount > 0 && (
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <Briefcase className="h-3 w-3" /> {caseCount} case{caseCount !== 1 ? "s" : ""} ({openCases} open)
                        </span>
                      )}
                      {revenue > 0 && (
                        <span className="text-xs text-slate-600">
                          ${revenue.toFixed(2)} paid
                        </span>
                      )}
                    </div>
                    {client.notes && (
                      <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">{client.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => {
                      const lines = [`CLIENT PROFILE`, `${"=".repeat(50)}`, `Name:    ${client.name}`, `Email:   ${client.email || "N/A"}`, `Phone:   ${client.phone || "N/A"}`, `Company: ${client.company || "N/A"}`, `Status:  ${client.status}`, `Address: ${client.address || "N/A"}`, ``, `Notes:`, client.notes || "(none)", ``, `Cases: ${caseCount} (${openCases} open)`, `Revenue: $${revenue.toFixed(2)}`];
                      downloadTextFile(`${client.name}.txt`, lines.join("\n"));
                    }} className="p-1.5 text-slate-400 hover:text-emerald-500 transition-colors" title="Download">
                      <Download className="h-4 w-4" />
                    </button>
                    <button onClick={() => startEdit(client)} className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors" title="Edit">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(client.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {hasMoreClients && (
            <div className="flex justify-center pt-1">
              <button
                onClick={() => loadData(false)}
                disabled={loadingMore}
                className="btn-base btn-sm btn-secondary"
              >
                {loadingMore ? "Loading..." : "Load more clients"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
