"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { DollarSign, Plus, Clock, Receipt, Zap, Briefcase, Loader2, Sparkles, Download } from "lucide-react";
import toast from "react-hot-toast";
import InlineAutocomplete from "@/components/InlineAutocomplete";
import FileImport from "@/components/FileImport";
import { downloadTextFile, invoiceToText } from "@/lib/download";

const PAGE_SIZE = 25;

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMoreInvoices, setLoadingMoreInvoices] = useState(false);
  const [loadingMoreTime, setLoadingMoreTime] = useState(false);
  const [hasMoreInvoices, setHasMoreInvoices] = useState(true);
  const [hasMoreTimeEntries, setHasMoreTimeEntries] = useState(true);
  const [autoLoading, setAutoLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"invoices" | "time">("invoices");
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const [showTimeForm, setShowTimeForm] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);

  const [autoGenForm, setAutoGenForm] = useState({ client_id: "", tax_rate: 0 });

  const [invoiceForm, setInvoiceForm] = useState({
    client_id: "",
    tax_rate: 0,
    notes: "",
    items: [{ description: "", quantity: 1, rate: 0, amount: 0 }],
  });

  const [timeForm, setTimeForm] = useState({
    description: "",
    hours: 0,
    rate: 250,
    date: new Date().toISOString().split("T")[0],
    is_billable: true,
    case_id: "",
  });

  useEffect(() => { loadData(true); }, []);

  async function loadData(reset = true) {
    const invoiceOffset = reset ? 0 : invoices.length;
    const timeOffset = reset ? 0 : timeEntries.length;
    if (reset) setLoading(true);
    try {
      const [inv, time, cls, cs] = await Promise.all([
        api.getInvoices({ limit: PAGE_SIZE, offset: invoiceOffset }),
        api.getTimeEntries({ limit: PAGE_SIZE, offset: timeOffset }),
        reset ? api.getClients() : Promise.resolve(clients),
        reset ? api.getCases() : Promise.resolve(cases),
      ]);

      setInvoices(prev => (reset ? inv : [...prev, ...inv]));
      setTimeEntries(prev => (reset ? time : [...prev, ...time]));
      setHasMoreInvoices(inv.length === PAGE_SIZE);
      setHasMoreTimeEntries(time.length === PAGE_SIZE);

      if (reset) {
        setClients(cls as any[]);
        setCases(cs as any[]);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function loadMoreInvoices() {
    if (loadingMoreInvoices || !hasMoreInvoices) return;
    setLoadingMoreInvoices(true);
    try {
      const next = await api.getInvoices({ limit: PAGE_SIZE, offset: invoices.length });
      setInvoices(prev => [...prev, ...next]);
      setHasMoreInvoices(next.length === PAGE_SIZE);
    } catch (e) { console.error(e); }
    finally { setLoadingMoreInvoices(false); }
  }

  async function loadMoreTimeEntries() {
    if (loadingMoreTime || !hasMoreTimeEntries) return;
    setLoadingMoreTime(true);
    try {
      const next = await api.getTimeEntries({ limit: PAGE_SIZE, offset: timeEntries.length });
      setTimeEntries(prev => [...prev, ...next]);
      setHasMoreTimeEntries(next.length === PAGE_SIZE);
    } catch (e) { console.error(e); }
    finally { setLoadingMoreTime(false); }
  }

  function updateInvoiceItem(index: number, field: string, value: any) {
    const items = [...invoiceForm.items];
    (items[index] as any)[field] = value;
    if (field === "quantity" || field === "rate") {
      items[index].amount = items[index].quantity * items[index].rate;
    }
    setInvoiceForm({ ...invoiceForm, items });
  }

  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createInvoice(invoiceForm);
      toast.success("Invoice created");
      setShowInvoiceForm(false);
      loadData(true);
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleAutoGenerate(e: React.FormEvent) {
    e.preventDefault();
    setAutoLoading(true);
    try {
      const result = await api.autoGenerateInvoice(autoGenForm);
      toast.success(`Invoice ${result.invoice_number} generated from time entries!`);
      setShowAutoGenerate(false);
      setAutoGenForm({ client_id: "", tax_rate: 0 });
      loadData(true);
    } catch (err: any) { toast.error(err.message); }
    finally { setAutoLoading(false); }
  }

  async function handleCreateTimeEntry(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: any = {
        ...timeForm,
        date: new Date(timeForm.date).toISOString(),
      };
      if (!payload.case_id) delete payload.case_id;
      await api.createTimeEntry(payload);
      toast.success("Time entry created");
      setShowTimeForm(false);
      setTimeForm({ description: "", hours: 0, rate: 250, date: new Date().toISOString().split("T")[0], is_billable: true, case_id: "" });
      loadData(true);
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleTimeAutoFill() {
    setAutoFilling(true);
    try {
      const caseName = timeForm.case_id ? cases.find(c => c.id === timeForm.case_id)?.title : "";
      const ctx = caseName ? `Case: ${caseName}` : "";
      const result = await api.aiAutoFill("time_entry", ["description", "hours", "rate"], timeForm, ctx);
      setTimeForm(prev => ({
        ...prev,
        description: result.description || prev.description,
        hours: typeof result.hours === "number" ? result.hours : prev.hours,
        rate: typeof result.rate === "number" ? result.rate : prev.rate,
      }));
      toast.success("Time entry auto-filled by AI");
    } catch (err: any) { toast.error(err.message || "Auto-fill failed"); }
    finally { setAutoFilling(false); }
  }

  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    sent: "bg-slate-200 text-slate-700",
    paid: "bg-slate-100 text-slate-700",
    overdue: "bg-red-100 text-red-700",
    cancelled: "bg-slate-100 text-slate-400",
  };

  const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((sum, inv) => sum + Number(inv.total), 0);
  const totalHours = timeEntries.reduce((sum, t) => sum + Number(t.hours), 0);
  const unbilledEntries = timeEntries.filter(t => !t.is_billed && t.is_billable);
  const unbilledAmount = unbilledEntries.reduce((sum, t) => sum + Number(t.hours) * Number(t.rate), 0);

  // Helper to get case name
  const getCaseName = (caseId: string) => cases.find(c => c.id === caseId)?.title || "";
  const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || "";

  // Get clients that have unbilled time entries (via cases)
  const clientsWithUnbilled = clients.filter(client => {
    const clientCaseIds = cases.filter(c => c.client_id === client.id).map(c => c.id);
    return unbilledEntries.some(e => clientCaseIds.includes(e.case_id));
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Billing</h1>
          <p className="text-slate-500 mt-1">Invoices, time tracking, and payments</p>
        </div>
        <FileImport
          onImport={(data) => api.importBilling(data).then((r) => { loadData(); return r; })}
          sampleFields={["description", "hours", "rate", "date", "case_id", "is_billable"]}
          entityName="time entry"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="panel">
          <p className="text-sm text-slate-500">Total Billed</p>
          <p className="text-2xl font-bold text-slate-800">${totalBilled.toFixed(2)}</p>
        </div>
        <div className="panel">
          <p className="text-sm text-slate-500">Total Paid</p>
          <p className="text-2xl font-bold text-slate-700">${totalPaid.toFixed(2)}</p>
        </div>
        <div className="panel">
          <p className="text-sm text-slate-500">Total Hours Logged</p>
          <p className="text-2xl font-bold text-slate-800">{totalHours.toFixed(1)}h</p>
        </div>
        <div className="panel border-slate-300">
          <p className="text-sm text-slate-600">Unbilled Amount</p>
          <p className="text-2xl font-bold text-slate-700">${unbilledAmount.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">{unbilledEntries.length} entries</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("invoices")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "invoices" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
        >
          <Receipt className="h-4 w-4 inline mr-1.5" />
          Invoices
        </button>
        <button
          onClick={() => setActiveTab("time")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "time" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
        >
          <Clock className="h-4 w-4 inline mr-1.5" />
          Time Entries
        </button>
      </div>

      {activeTab === "invoices" && (
        <>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowAutoGenerate(!showAutoGenerate); setShowInvoiceForm(false); }}
              className="btn-base btn-md btn-amber"
            >
              <Zap className="h-4 w-4" />
              Auto-Generate from Time Entries
            </button>
            <button
              onClick={() => { setShowInvoiceForm(!showInvoiceForm); setShowAutoGenerate(false); }}
              className="btn-base btn-md btn-primary"
            >
              <Plus className="h-4 w-4" />
              Manual Invoice
            </button>
          </div>

          {/* Auto-Generate Form */}
          {showAutoGenerate && (
            <div className="panel border-amber-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <Zap className="h-5 w-5 text-slate-600" />
                Auto-Generate Invoice
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Automatically creates an invoice from all unbilled time entries linked to the selected client's cases.
              </p>

              {clientsWithUnbilled.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-lg text-center">
                  <p className="text-sm text-slate-500">No clients with unbilled time entries found.</p>
                  <p className="text-xs text-slate-400 mt-1">Log billable time entries linked to cases first.</p>
                </div>
              ) : (
                <form onSubmit={handleAutoGenerate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
                      <select
                        required
                        value={autoGenForm.client_id}
                        onChange={(e) => setAutoGenForm({ ...autoGenForm, client_id: e.target.value })}
                        className="field"
                      >
                        <option value="">Select client with unbilled entries</option>
                        {clientsWithUnbilled.map((c) => {
                          const clientCaseIds = cases.filter(cs => cs.client_id === c.id).map(cs => cs.id);
                          const clientUnbilled = unbilledEntries.filter(e => clientCaseIds.includes(e.case_id));
                          const clientAmount = clientUnbilled.reduce((s, e) => s + Number(e.hours) * Number(e.rate), 0);
                          return (
                            <option key={c.id} value={c.id}>
                              {c.name} — {clientUnbilled.length} entries (${clientAmount.toFixed(2)})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tax Rate (%)</label>
                      <input
                        type="number"
                        value={autoGenForm.tax_rate}
                        onChange={(e) => setAutoGenForm({ ...autoGenForm, tax_rate: parseFloat(e.target.value) || 0 })}
                        className="field"
                      />
                    </div>
                  </div>

                  {/* Preview of what will be invoiced */}
                  {autoGenForm.client_id && (() => {
                    const clientCaseIds = cases.filter(c => c.client_id === autoGenForm.client_id).map(c => c.id);
                    const preview = unbilledEntries.filter(e => clientCaseIds.includes(e.case_id));
                    return preview.length > 0 ? (
                      <div className="bg-amber-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-amber-800 mb-2">Preview: {preview.length} time entries will be invoiced</h4>
                        <div className="space-y-1">
                          {preview.map((entry) => (
                            <div key={entry.id} className="flex justify-between text-sm">
                              <span className="text-slate-600">
                                {entry.description}
                                {entry.case_id && <span className="text-slate-500 ml-1">({getCaseName(entry.case_id)})</span>}
                              </span>
                              <span className="font-medium text-slate-700">
                                {Number(entry.hours).toFixed(1)}h × ${Number(entry.rate)} = ${(Number(entry.hours) * Number(entry.rate)).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-amber-200 mt-2 pt-2 flex justify-between font-semibold text-sm">
                          <span>Total</span>
                          <span>${preview.reduce((s, e) => s + Number(e.hours) * Number(e.rate), 0).toFixed(2)}</span>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={autoLoading}
                      className="btn-base btn-sm btn-amber"
                    >
                      {autoLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Generate Invoice
                    </button>
                    <button type="button" onClick={() => setShowAutoGenerate(false)} className="btn-base btn-sm btn-secondary">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Manual Invoice Form */}
          {showInvoiceForm && (
            <div className="panel p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Manual Invoice</h3>
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
                    <select
                      required
                      value={invoiceForm.client_id}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, client_id: e.target.value })}
                      className="field"
                    >
                      <option value="">Select Client</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tax Rate (%)</label>
                    <input
                      type="number"
                      value={invoiceForm.tax_rate}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, tax_rate: parseFloat(e.target.value) })}
                      className="field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Line Items</label>
                  {invoiceForm.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                      <input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateInvoiceItem(i, "description", e.target.value)}
                        className="col-span-2 field"
                      />
                      <input
                        type="number"
                        placeholder="Rate"
                        value={item.rate || ""}
                        onChange={(e) => updateInvoiceItem(i, "rate", parseFloat(e.target.value))}
                        className="field"
                      />
                      <div className="flex items-center text-sm font-medium text-slate-600">
                        ${item.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setInvoiceForm({ ...invoiceForm, items: [...invoiceForm.items, { description: "", quantity: 1, rate: 0, amount: 0 }] })}
                    className="text-sm text-slate-600 hover:text-slate-800 mt-1"
                  >
                    + Add item
                  </button>
                </div>

                <div className="flex gap-3">
                  <button type="submit" className="btn-base btn-sm btn-primary">
                    Create Invoice
                  </button>
                  <button type="button" onClick={() => setShowInvoiceForm(false)} className="btn-base btn-sm btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {invoices.length === 0 ? (
            <div className="panel text-center py-16">
              <Receipt className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-medium text-slate-600">No invoices yet</h3>
            </div>
          ) : (
            <div className="grid gap-4">
              {invoices.map((inv) => (
                <div key={inv.id} className="panel defer-render">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-slate-800">{inv.invoice_number}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[inv.status]}`}>
                          {inv.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        {getClientName(inv.client_id)}
                        {inv.due_date && ` · Due: ${new Date(inv.due_date).toLocaleDateString()}`}
                      </p>
                      {inv.notes && <p className="text-xs text-slate-400 mt-1">{inv.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-bold text-slate-800">${Number(inv.total).toFixed(2)}</p>
                      <button
                        onClick={() => downloadTextFile(`${inv.invoice_number || "invoice"}.txt`, invoiceToText(inv, getClientName(inv.client_id), inv.items))}
                        className="p-1.5 text-slate-400 hover:text-emerald-500 transition-colors" title="Download">
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {hasMoreInvoices && (
                <div className="flex justify-center pt-1">
                  <button
                    onClick={loadMoreInvoices}
                    disabled={loadingMoreInvoices}
                    className="btn-base btn-sm btn-secondary"
                  >
                    {loadingMoreInvoices ? "Loading..." : "Load more invoices"}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === "time" && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => setShowTimeForm(!showTimeForm)}
              className="btn-base btn-md btn-primary"
            >
              <Plus className="h-4 w-4" />
              Log Time
            </button>
          </div>

          {showTimeForm && (
            <div className="panel p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                Log Time
              </h3>
              <form onSubmit={handleCreateTimeEntry} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="flex items-center justify-between text-sm font-medium text-slate-700 mb-1">
                    Description *
                    <button type="button" onClick={handleTimeAutoFill} disabled={autoFilling}
                      className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-medium hover:bg-slate-200 disabled:opacity-50 border border-slate-200 transition-colors">
                      {autoFilling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      AI Auto-Fill All
                    </button>
                  </label>
                  <InlineAutocomplete
                    required
                    value={timeForm.description}
                    onChange={(v) => setTimeForm({ ...timeForm, description: v })}
                    fieldType="time_entry"
                    placeholder="e.g. Legal research on precedent cases"
                    className="field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Case (for invoicing)</label>
                  <select
                    value={timeForm.case_id}
                    onChange={(e) => setTimeForm({ ...timeForm, case_id: e.target.value })}
                    className="field"
                  >
                    <option value="">No case</option>
                    {cases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hours *</label>
                  <input
                    required
                    type="number"
                    step="0.25"
                    value={timeForm.hours || ""}
                    onChange={(e) => setTimeForm({ ...timeForm, hours: parseFloat(e.target.value) })}
                    className="field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rate ($/hr)</label>
                  <input
                    type="number"
                    value={timeForm.rate}
                    onChange={(e) => setTimeForm({ ...timeForm, rate: parseFloat(e.target.value) })}
                    className="field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={timeForm.date}
                    onChange={(e) => setTimeForm({ ...timeForm, date: e.target.value })}
                    className="field"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={timeForm.is_billable}
                      onChange={(e) => setTimeForm({ ...timeForm, is_billable: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-700">Billable</span>
                  </label>
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <button type="submit" className="btn-base btn-sm btn-primary">Log Time</button>
                  <button type="button" onClick={() => setShowTimeForm(false)} className="btn-base btn-sm btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {timeEntries.length === 0 ? (
            <div className="panel text-center py-16">
              <Clock className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-medium text-slate-600">No time entries yet</h3>
            </div>
          ) : (
            <div className="grid gap-3">
              {timeEntries.map((entry) => (
                <div key={entry.id} className="panel defer-render p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800">{entry.description}</p>
                      {entry.is_billed && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">billed</span>
                      )}
                      {!entry.is_billable && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">non-billable</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-slate-500">{new Date(entry.date).toLocaleDateString()}</p>
                      {entry.case_id && (
                        <span className="text-xs text-blue-500 flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {getCaseName(entry.case_id)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-800">{Number(entry.hours).toFixed(1)}h</p>
                    <p className="text-sm text-slate-500">${(Number(entry.hours) * Number(entry.rate)).toFixed(2)}</p>
                  </div>
                </div>
              ))}
              {hasMoreTimeEntries && (
                <div className="flex justify-center pt-1">
                  <button
                    onClick={loadMoreTimeEntries}
                    disabled={loadingMoreTime}
                    className="btn-base btn-sm btn-secondary"
                  >
                    {loadingMoreTime ? "Loading..." : "Load more time entries"}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
