"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { DollarSign, Plus, Clock, Receipt } from "lucide-react";
import toast from "react-hot-toast";

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"invoices" | "time">("invoices");
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showTimeForm, setShowTimeForm] = useState(false);

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
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [inv, time, cls] = await Promise.all([
        api.getInvoices(),
        api.getTimeEntries(),
        api.getClients(),
      ]);
      setInvoices(inv);
      setTimeEntries(time);
      setClients(cls);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
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
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleCreateTimeEntry(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createTimeEntry({
        ...timeForm,
        date: new Date(timeForm.date).toISOString(),
      });
      toast.success("Time entry created");
      setShowTimeForm(false);
      setTimeForm({ description: "", hours: 0, rate: 250, date: new Date().toISOString().split("T")[0], is_billable: true });
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    sent: "bg-blue-100 text-blue-700",
    paid: "bg-emerald-100 text-emerald-700",
    overdue: "bg-red-100 text-red-700",
    cancelled: "bg-slate-100 text-slate-400",
  };

  const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((sum, inv) => sum + Number(inv.total), 0);
  const totalHours = timeEntries.reduce((sum, t) => sum + Number(t.hours), 0);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Billing</h1>
          <p className="text-slate-500 mt-1">Invoices, time tracking, and payments</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Total Billed</p>
          <p className="text-2xl font-bold text-slate-800">${totalBilled.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Total Paid</p>
          <p className="text-2xl font-bold text-emerald-600">${totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Total Hours Logged</p>
          <p className="text-2xl font-bold text-slate-800">{totalHours.toFixed(1)}h</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit mb-6">
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
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowInvoiceForm(!showInvoiceForm)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              <Plus className="h-4 w-4" />
              New Invoice
            </button>
          </div>

          {showInvoiceForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">New Invoice</h3>
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
                    <select
                      required
                      value={invoiceForm.client_id}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, client_id: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                        className="col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Rate"
                        value={item.rate || ""}
                        onChange={(e) => updateInvoiceItem(i, "rate", parseFloat(e.target.value))}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <div className="flex items-center text-sm font-medium text-slate-600">
                        ${item.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setInvoiceForm({ ...invoiceForm, items: [...invoiceForm.items, { description: "", quantity: 1, rate: 0, amount: 0 }] })}
                    className="text-sm text-blue-600 hover:text-blue-700 mt-1"
                  >
                    + Add item
                  </button>
                </div>

                <div className="flex gap-3">
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                    Create Invoice
                  </button>
                  <button type="button" onClick={() => setShowInvoiceForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {invoices.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <Receipt className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-medium text-slate-600">No invoices yet</h3>
            </div>
          ) : (
            <div className="grid gap-4">
              {invoices.map((inv) => (
                <div key={inv.id} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-slate-800">{inv.invoice_number}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[inv.status]}`}>
                          {inv.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        {inv.due_date && `Due: ${new Date(inv.due_date).toLocaleDateString()}`}
                      </p>
                    </div>
                    <p className="text-xl font-bold text-slate-800">${Number(inv.total).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "time" && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowTimeForm(!showTimeForm)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              <Plus className="h-4 w-4" />
              Log Time
            </button>
          </div>

          {showTimeForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Log Time</h3>
              <form onSubmit={handleCreateTimeEntry} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                  <input
                    required
                    value={timeForm.description}
                    onChange={(e) => setTimeForm({ ...timeForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hours *</label>
                  <input
                    required
                    type="number"
                    step="0.25"
                    value={timeForm.hours || ""}
                    onChange={(e) => setTimeForm({ ...timeForm, hours: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rate ($/hr)</label>
                  <input
                    type="number"
                    value={timeForm.rate}
                    onChange={(e) => setTimeForm({ ...timeForm, rate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={timeForm.date}
                    onChange={(e) => setTimeForm({ ...timeForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Log Time</button>
                  <button type="button" onClick={() => setShowTimeForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {timeEntries.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <Clock className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-medium text-slate-600">No time entries yet</h3>
            </div>
          ) : (
            <div className="grid gap-3">
              {timeEntries.map((entry) => (
                <div key={entry.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">{entry.description}</p>
                    <p className="text-sm text-slate-500">{new Date(entry.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-800">{Number(entry.hours).toFixed(1)}h</p>
                    <p className="text-sm text-slate-500">${(Number(entry.hours) * Number(entry.rate)).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
