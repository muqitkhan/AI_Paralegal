"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Calendar as CalIcon, Plus, AlertTriangle, CheckCircle2, Briefcase, Clock, Trash2, Zap, Sparkles, Loader2, Filter, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import InlineAutocomplete from "@/components/InlineAutocomplete";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import FileImport from "@/components/FileImport";

const eventTypes = ["hearing", "meeting", "deposition", "filing", "consultation", "other"];
const priorities = ["low", "medium", "high", "critical"];
const appointmentStatuses = ["scheduled", "confirmed", "completed", "cancelled", "missed"];

export default function CalendarPage() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"events" | "deadlines" | "appointments">("deadlines");
  const [showEventForm, setShowEventForm] = useState(false);
  const [showDeadlineForm, setShowDeadlineForm] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [filterCase, setFilterCase] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [autoCaseId, setAutoCaseId] = useState("");
  const [autoFilling, setAutoFilling] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [automationRunning, setAutomationRunning] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);

  const [eventForm, setEventForm] = useState({
    title: "",
    event_type: "meeting",
    description: "",
    location: "",
    start_time: "",
    end_time: "",
  });

  const [deadlineForm, setDeadlineForm] = useState({
    title: "",
    description: "",
    due_date: "",
    priority: "medium",
    reminder_days: 3,
    case_id: "",
  });

  const [appointmentForm, setAppointmentForm] = useState({
    title: "",
    case_id: "",
    client_id: "",
    notes: "",
    location: "",
    start_time: "",
    end_time: "",
    status: "scheduled",
    reminder_minutes: 30,
    auto_follow_up: true,
    follow_up_template: "",
  });

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "appointments" || tab === "events" || tab === "deadlines") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  async function loadData() {
    try {
      const [ev, dl, ap, cs, cl] = await Promise.all([
        api.getEvents().catch(() => []),
        api.getDeadlines().catch(() => []),
        api.getAppointments().catch(() => []),
        api.getCases().catch(() => []),
        api.getClients().catch(() => []),
      ]);
      setEvents(ev); setDeadlines(dl); setAppointments(ap); setCases(cs); setClients(cl);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createEvent({
        ...eventForm,
        start_time: new Date(eventForm.start_time).toISOString(),
        end_time: new Date(eventForm.end_time).toISOString(),
      });
      toast.success("Event created");
      setShowEventForm(false);
      setEventForm({ title: "", event_type: "meeting", description: "", location: "", start_time: "", end_time: "" });
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleEventAutoFill() {
    setAutoFilling(true);
    try {
      const result = await api.aiAutoFill("event", ["title", "event_type", "description", "location", "start_time", "end_time"], eventForm);
      setEventForm(prev => ({
        ...prev,
        title: result.title || prev.title,
        event_type: result.event_type || prev.event_type,
        description: result.description || prev.description,
        location: result.location || prev.location,
        start_time: result.start_time ? result.start_time.slice(0, 16) : prev.start_time,
        end_time: result.end_time ? result.end_time.slice(0, 16) : prev.end_time,
      }));
      toast.success("Event auto-filled by AI");
    } catch (err: any) { toast.error(err.message || "Auto-fill failed"); }
    finally { setAutoFilling(false); }
  }

  async function handleCreateDeadline(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: any = { ...deadlineForm, due_date: new Date(deadlineForm.due_date).toISOString() };
      if (!payload.case_id) delete payload.case_id;
      await api.createDeadline(payload);
      toast.success("Deadline created");
      setShowDeadlineForm(false);
      setDeadlineForm({ title: "", description: "", due_date: "", priority: "medium", reminder_days: 3, case_id: "" });
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleDeadlineAutoFill() {
    setAutoFilling(true);
    try {
      const caseName = deadlineForm.case_id ? cases.find(c => c.id === deadlineForm.case_id)?.title : "";
      const ctx = caseName ? `Case: ${caseName}` : "";
      const result = await api.aiAutoFill("deadline", ["title", "description", "due_date", "priority", "reminder_days"], deadlineForm, ctx);
      setDeadlineForm(prev => ({
        ...prev,
        title: result.title || prev.title,
        description: result.description || prev.description,
        due_date: result.due_date ? result.due_date.slice(0, 16) : prev.due_date,
        priority: result.priority || prev.priority,
        reminder_days: typeof result.reminder_days === "number" ? result.reminder_days : prev.reminder_days,
      }));
      toast.success("Deadline auto-filled by AI");
    } catch (err: any) { toast.error(err.message || "Auto-fill failed"); }
    finally { setAutoFilling(false); }
  }

  async function toggleDeadline(id: string, completed: boolean) {
    try { await api.updateDeadline(id, { is_completed: !completed }); loadData(); } catch (err: any) { toast.error(err.message); }
  }

  async function deleteDeadline(id: string) {
    if (!confirm("Delete this deadline?")) return;
    try { await api.deleteDeadline(id); toast.success("Deleted"); loadData(); } catch (err: any) { toast.error(err.message); }
  }

  async function deleteEvent(id: string) {
    if (!confirm("Delete this event?")) return;
    try { await api.deleteEvent(id); toast.success("Deleted"); loadData(); } catch (err: any) { toast.error(err.message); }
  }

  async function handleCreateAppointment(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: any = {
        ...appointmentForm,
        start_time: new Date(appointmentForm.start_time).toISOString(),
        end_time: new Date(appointmentForm.end_time).toISOString(),
      };
      if (!payload.case_id) delete payload.case_id;
      if (!payload.client_id) delete payload.client_id;
      if (!payload.follow_up_template) delete payload.follow_up_template;
      if (editingAppointmentId) {
        await api.updateAppointment(editingAppointmentId, payload);
        toast.success("Appointment updated");
      } else {
        await api.createAppointment(payload);
        toast.success("Appointment created");
      }
      setShowAppointmentForm(false);
      setEditingAppointmentId(null);
      setAppointmentForm({
        title: "",
        case_id: "",
        client_id: "",
        notes: "",
        location: "",
        start_time: "",
        end_time: "",
        status: "scheduled",
        reminder_minutes: 30,
        auto_follow_up: true,
        follow_up_template: "",
      });
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  function toLocalDateTimeInput(iso: string) {
    const date = new Date(iso);
    const offsetMinutes = date.getTimezoneOffset();
    return new Date(date.getTime() - offsetMinutes * 60_000).toISOString().slice(0, 16);
  }

  function handleEditAppointment(appointment: any) {
    setEditingAppointmentId(appointment.id);
    setShowAppointmentForm(true);
    setAppointmentForm({
      title: appointment.title || "",
      case_id: appointment.case_id || "",
      client_id: appointment.client_id || "",
      notes: appointment.notes || "",
      location: appointment.location || "",
      start_time: appointment.start_time ? toLocalDateTimeInput(appointment.start_time) : "",
      end_time: appointment.end_time ? toLocalDateTimeInput(appointment.end_time) : "",
      status: appointment.status || "scheduled",
      reminder_minutes: typeof appointment.reminder_minutes === "number" ? appointment.reminder_minutes : 30,
      auto_follow_up: typeof appointment.auto_follow_up === "boolean" ? appointment.auto_follow_up : true,
      follow_up_template: appointment.follow_up_template || "",
    });
  }

  function resetAppointmentForm() {
    setShowAppointmentForm(false);
    setEditingAppointmentId(null);
    setAppointmentForm({
      title: "",
      case_id: "",
      client_id: "",
      notes: "",
      location: "",
      start_time: "",
      end_time: "",
      status: "scheduled",
      reminder_minutes: 30,
      auto_follow_up: true,
      follow_up_template: "",
    });
  }

  async function updateAppointmentStatus(id: string, status: string) {
    try {
      await api.updateAppointment(id, { status });
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function deleteAppointment(id: string) {
    if (!confirm("Delete this appointment?")) return;
    try { await api.deleteAppointment(id); toast.success("Deleted"); loadData(); } catch (err: any) { toast.error(err.message); }
  }

  async function runAppointmentAutomation() {
    setAutomationRunning(true);
    try {
      const result = await api.runAppointmentAutomation({ reminder_window_minutes: 60, follow_up_due_days: 2 });
      toast.success(`Automation complete: ${result.reminders_flagged} reminders, ${result.followups_created} follow-ups`);
      if (result.reminders.length) {
        toast((t) => (
          <div className="text-sm">
            <p className="font-semibold">Upcoming reminders</p>
            <ul className="list-disc ml-4">
              {result.reminders.slice(0, 3).map((reminder: string) => <li key={reminder}>{reminder}</li>)}
            </ul>
            <button onClick={() => toast.dismiss(t.id)} className="mt-1 text-xs text-blue-600">Dismiss</button>
          </div>
        ));
      }
      loadData();
    } catch (err: any) { toast.error(err.message || "Automation failed"); }
    finally { setAutomationRunning(false); }
  }

  async function autoCreateDeadlines(caseId: string) {
    const c = cases.find(cs => cs.id === caseId);
    if (!c) return;
    const templates = [
      { title: `${c.title} — Discovery Deadline`, priority: "high", days: 30 },
      { title: `${c.title} — Motion Filing Deadline`, priority: "high", days: 60 },
      { title: `${c.title} — Pre-Trial Conference`, priority: "critical", days: 90 },
      { title: `${c.title} — Trial Prep Deadline`, priority: "medium", days: 14 },
    ];
    try {
      for (const t of templates) {
        const due = new Date();
        due.setDate(due.getDate() + t.days);
        await api.createDeadline({
          title: t.title,
          description: `Auto-generated deadline for case: ${c.title}`,
          due_date: due.toISOString(),
          priority: t.priority,
          reminder_days: 3,
          case_id: caseId,
        });
      }
      toast.success(`4 deadlines created for ${c.title}`);
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  function handleStartTimeChange(val: string) {
    setEventForm(prev => {
      const end = new Date(val);
      end.setHours(end.getHours() + 1);
      const endStr = end.toISOString().slice(0, 16);
      return { ...prev, start_time: val, end_time: prev.end_time || endStr };
    });
  }

  const priorityColors: Record<string, string> = {
    low: "bg-slate-100 text-slate-600",
    medium: "bg-blue-100 text-blue-700",
    high: "bg-amber-100 text-amber-700",
    critical: "bg-red-100 text-red-700",
  };

  const getCaseName = (caseId: string) => cases.find(c => c.id === caseId)?.title || "";
  const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || "";

  const now = new Date();
  const isOverdue = (d: any) => !d.is_completed && new Date(d.due_date) < now;
  const isToday = (d: any) => new Date(d.due_date).toDateString() === now.toDateString();

  let filteredDeadlines = deadlines;
  if (filterCase) filteredDeadlines = filteredDeadlines.filter(d => d.case_id === filterCase);
  if (filterPriority) filteredDeadlines = filteredDeadlines.filter(d => d.priority === filterPriority);
  if (!showCompleted) filteredDeadlines = filteredDeadlines.filter(d => !d.is_completed);

  const overdueDeadlines = filteredDeadlines.filter(isOverdue);
  const todayDeadlines = filteredDeadlines.filter(d => !d.is_completed && isToday(d) && !isOverdue(d));
  const upcomingDeadlines = filteredDeadlines.filter(d => !d.is_completed && !isOverdue(d) && !isToday(d));
  const completedDeadlines = filteredDeadlines.filter(d => d.is_completed);

  const overdueCount = deadlines.filter(d => !d.is_completed && new Date(d.due_date) < now).length;
  const todayCount = deadlines.filter(d => !d.is_completed && isToday(d)).length;
  const activeCount = deadlines.filter(d => !d.is_completed).length;
  const scheduledAppointments = appointments.filter(a => ["scheduled", "confirmed"].includes(a.status)).length;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Calendar & Deadlines</h1>
          <p className="text-slate-500 mt-1">Track court dates, filings, and important deadlines</p>
        </div>
        {activeTab !== "appointments" && (
          <FileImport
            onImport={(data) => api.importCalendar(data, activeTab === "events" ? "events" : "deadlines").then((r) => { loadData(); return r; })}
            sampleFields={activeTab === "events" ? ["title", "event_type", "start_time", "end_time", "location"] : ["title", "due_date", "priority", "case_id", "description"]}
            entityName={activeTab === "events" ? "event" : "deadline"}
          />
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <div className="panel">
          <p className="text-sm text-slate-500">Active Deadlines</p>
          <p className="text-2xl font-bold text-slate-800">{activeCount}</p>
        </div>
        <div className={`panel ${overdueCount > 0 ? "border-red-200" : "border-slate-200"}`}>
          <p className={`text-sm ${overdueCount > 0 ? "text-red-600" : "text-slate-500"}`}>Overdue</p>
          <p className={`text-2xl font-bold ${overdueCount > 0 ? "text-red-600" : "text-slate-400"}`}>{overdueCount}</p>
        </div>
        <div className={`panel ${todayCount > 0 ? "border-amber-200" : "border-slate-200"}`}>
          <p className={`text-sm ${todayCount > 0 ? "text-amber-600" : "text-slate-500"}`}>Due Today</p>
          <p className={`text-2xl font-bold ${todayCount > 0 ? "text-amber-600" : "text-slate-400"}`}>{todayCount}</p>
        </div>
        <div className="panel">
          <p className="text-sm text-slate-500">Appts (Active)</p>
          <p className="text-2xl font-bold text-indigo-600">{scheduledAppointments}</p>
        </div>
        <div className="panel">
          <p className="text-sm text-slate-500">Events</p>
          <p className="text-2xl font-bold text-blue-600">{events.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button onClick={() => setActiveTab("deadlines")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "deadlines" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
          <AlertTriangle className="h-4 w-4 inline mr-1.5" />
          Deadlines {overdueCount > 0 && <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">{overdueCount}</span>}
        </button>
        <button onClick={() => setActiveTab("events")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "events" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
          <CalIcon className="h-4 w-4 inline mr-1.5" />
          Events
        </button>
        <button onClick={() => setActiveTab("appointments")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "appointments" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
          <Clock className="h-4 w-4 inline mr-1.5" />
          Appointments
        </button>
      </div>

      {activeTab === "deadlines" && (
        <>
          {/* Clean action bar */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                showFilters || filterCase || filterPriority || showCompleted
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
              {(filterCase || filterPriority || showCompleted) && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-blue-600 text-white rounded-full">
                  {[filterCase, filterPriority, showCompleted].filter(Boolean).length}
                </span>
              )}
              {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            <button onClick={() => setShowDeadlineForm(!showDeadlineForm)}
              className="btn-base btn-sm btn-primary">
              <Plus className="h-4 w-4" /> New Deadline
            </button>
          </div>

          {/* Collapsible filters */}
          {showFilters && (
            <div className="panel-soft p-4 mb-4 flex flex-wrap gap-3 items-center">
              <select value={filterCase} onChange={(e) => setFilterCase(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">All Cases</option>
                {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">All Priorities</option>
                {priorities.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                <input type="checkbox" checked={showCompleted} onChange={() => setShowCompleted(!showCompleted)} className="rounded" />
                Show completed
              </label>
              {(filterCase || filterPriority || showCompleted) && (
                <button
                  onClick={() => { setFilterCase(""); setFilterPriority(""); setShowCompleted(false); }}
                  className="ml-auto text-xs text-red-500 hover:text-red-600 font-medium"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {showDeadlineForm && (
            <div className="panel p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                New Deadline
              </h3>
              <form onSubmit={handleCreateDeadline} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                  <InlineAutocomplete required value={deadlineForm.title} onChange={(v) => setDeadlineForm({ ...deadlineForm, title: v })} fieldType="deadline_title"
                    placeholder="e.g. Discovery Deadline"
                    className="field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Related Case</label>
                  <select value={deadlineForm.case_id} onChange={(e) => setDeadlineForm({ ...deadlineForm, case_id: e.target.value })}
                    className="field">
                    <option value="">No case</option>
                    {cases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date *</label>
                  <input required type="datetime-local" value={deadlineForm.due_date}
                    onChange={(e) => setDeadlineForm({ ...deadlineForm, due_date: e.target.value })}
                    className="field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select value={deadlineForm.priority} onChange={(e) => setDeadlineForm({ ...deadlineForm, priority: e.target.value })}
                    className="field">
                    {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Remind (days before)</label>
                  <input type="number" value={deadlineForm.reminder_days}
                    onChange={(e) => setDeadlineForm({ ...deadlineForm, reminder_days: parseInt(e.target.value) })}
                    className="field" />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center justify-between text-sm font-medium text-slate-700 mb-1">
                    Description
                    <button type="button" onClick={handleDeadlineAutoFill} disabled={autoFilling}
                      className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[11px] font-medium hover:bg-emerald-100 disabled:opacity-50 border border-emerald-200 transition-colors">
                      {autoFilling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      AI Auto-Fill All
                    </button>
                  </label>
                  <InlineAutocomplete as="textarea" value={deadlineForm.description} onChange={(v) => setDeadlineForm({ ...deadlineForm, description: v })} fieldType="description"
                    context="legal filing deadline description" rows={2}
                    placeholder="Describe this deadline..."
                    className="field" />
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <button type="submit" className="btn-base btn-sm btn-primary">Create</button>
                  <button type="button" onClick={() => setShowDeadlineForm(false)} className="btn-base btn-sm btn-secondary">Cancel</button>
                </div>
              </form>
              {/* Auto Deadlines section - inside the form card */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-slate-700">Quick: Auto-generate deadlines for a case</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <select value={autoCaseId} onChange={(e) => setAutoCaseId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    <option value="">Select a case...</option>
                    {cases.filter(c => c.status !== "closed" && c.status !== "archived").map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => { if (autoCaseId) autoCreateDeadlines(autoCaseId); else toast.error("Select a case first"); }}
                    className="btn-base btn-sm btn-amber whitespace-nowrap">
                    <Zap className="h-3.5 w-3.5" /> Generate 4 Deadlines
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">Creates Discovery, Motion Filing, Pre-Trial Conference &amp; Trial Prep deadlines</p>
              </div>
            </div>
          )}

          {/* Grouped deadline sections */}
          {overdueDeadlines.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Overdue ({overdueDeadlines.length})
              </h3>
              <div className="grid gap-2">
                {overdueDeadlines.map(dl => (
                  <DeadlineCard key={dl.id} dl={dl} getCaseName={getCaseName} priorityColors={priorityColors} toggleDeadline={toggleDeadline} deleteDeadline={deleteDeadline} isOverdue />
                ))}
              </div>
            </div>
          )}

          {todayDeadlines.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-amber-600 mb-2 flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> Due Today ({todayDeadlines.length})
              </h3>
              <div className="grid gap-2">
                {todayDeadlines.map(dl => (
                  <DeadlineCard key={dl.id} dl={dl} getCaseName={getCaseName} priorityColors={priorityColors} toggleDeadline={toggleDeadline} deleteDeadline={deleteDeadline} />
                ))}
              </div>
            </div>
          )}

          {upcomingDeadlines.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-600 mb-2">Upcoming ({upcomingDeadlines.length})</h3>
              <div className="grid gap-2">
                {upcomingDeadlines.map(dl => (
                  <DeadlineCard key={dl.id} dl={dl} getCaseName={getCaseName} priorityColors={priorityColors} toggleDeadline={toggleDeadline} deleteDeadline={deleteDeadline} />
                ))}
              </div>
            </div>
          )}

          {showCompleted && completedDeadlines.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-emerald-600 mb-2">Completed ({completedDeadlines.length})</h3>
              <div className="grid gap-2">
                {completedDeadlines.map(dl => (
                  <DeadlineCard key={dl.id} dl={dl} getCaseName={getCaseName} priorityColors={priorityColors} toggleDeadline={toggleDeadline} deleteDeadline={deleteDeadline} />
                ))}
              </div>
            </div>
          )}

          {filteredDeadlines.length === 0 && (
            <div className="panel text-center py-16">
              <AlertTriangle className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-medium text-slate-600">No deadlines found</h3>
            </div>
          )}
        </>
      )}

      {activeTab === "events" && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowEventForm(!showEventForm)}
              className="btn-base btn-md btn-primary">
              <Plus className="h-4 w-4" /> New Event
            </button>
          </div>

          {showEventForm && (
            <div className="panel p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                New Event
              </h3>
              <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                  <InlineAutocomplete required value={eventForm.title} onChange={(v) => setEventForm({ ...eventForm, title: v })} fieldType="event_title"
                    placeholder="e.g. Client Meeting"
                    className="field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select value={eventForm.event_type} onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
                    className="field">
                    {eventTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start *</label>
                  <input required type="datetime-local" value={eventForm.start_time}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End *</label>
                  <input required type="datetime-local" value={eventForm.end_time}
                    onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                    className="field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <AddressAutocomplete value={eventForm.location} onChange={(v) => setEventForm({ ...eventForm, location: v })} fieldType="location"
                    placeholder="e.g. Courtroom 4B, Federal Building"
                    className="field" />
                </div>
                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-slate-700 mb-1">
                    Description
                    <button type="button" onClick={handleEventAutoFill} disabled={autoFilling}
                      className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[11px] font-medium hover:bg-emerald-100 disabled:opacity-50 border border-emerald-200 transition-colors">
                      {autoFilling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      AI Auto-Fill All
                    </button>
                  </label>
                  <InlineAutocomplete value={eventForm.description} onChange={(v) => setEventForm({ ...eventForm, description: v })} fieldType="description"
                    context="calendar event description for a law firm"
                    placeholder="Describe this event..."
                    className="field" />
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <button type="submit" className="btn-base btn-sm btn-primary">Create</button>
                  <button type="button" onClick={() => setShowEventForm(false)} className="btn-base btn-sm btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {events.length === 0 ? (
            <div className="panel text-center py-16">
              <CalIcon className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-medium text-slate-600">No events yet</h3>
            </div>
          ) : (
            <div className="grid gap-3">
              {events.map((ev) => (
                <div key={ev.id} className="panel p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-800">{ev.title}</h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{ev.event_type}</span>
                      </div>
                      {ev.location && <p className="text-sm text-slate-500 mt-1">{ev.location}</p>}
                      {ev.description && <p className="text-xs text-slate-400 mt-0.5">{ev.description}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-700">{new Date(ev.start_time).toLocaleDateString()}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(ev.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -
                          {new Date(ev.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <button onClick={() => deleteEvent(ev.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "appointments" && (
        <>
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={runAppointmentAutomation}
              disabled={automationRunning}
              className="btn-base btn-sm btn-amber disabled:opacity-60"
            >
              <Zap className="h-4 w-4" /> {automationRunning ? "Running..." : "Run Automation"}
            </button>
            <button onClick={() => setShowAppointmentForm(!showAppointmentForm)} className="btn-base btn-sm btn-primary">
              <Plus className="h-4 w-4" /> New Appointment
            </button>
          </div>

          {showAppointmentForm && (
            <div className="panel p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">{editingAppointmentId ? "Edit Appointment" : "New Appointment"}</h3>
              <form onSubmit={handleCreateAppointment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                  <InlineAutocomplete
                    required
                    value={appointmentForm.title}
                    onChange={(v) => setAppointmentForm({ ...appointmentForm, title: v })}
                    fieldType="appointment_title"
                    placeholder="e.g. Client Intake Call"
                    className="field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={appointmentForm.status}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, status: e.target.value })}
                    className="field"
                  >
                    {appointmentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
                  <select
                    value={appointmentForm.client_id}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, client_id: e.target.value })}
                    className="field"
                  >
                    <option value="">No client</option>
                    {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Case</label>
                  <select
                    value={appointmentForm.case_id}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, case_id: e.target.value })}
                    className="field"
                  >
                    <option value="">No case</option>
                    {cases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start *</label>
                  <input
                    required
                    type="datetime-local"
                    value={appointmentForm.start_time}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, start_time: e.target.value })}
                    className="field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End *</label>
                  <input
                    required
                    type="datetime-local"
                    value={appointmentForm.end_time}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, end_time: e.target.value })}
                    className="field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <AddressAutocomplete
                    value={appointmentForm.location}
                    onChange={(v) => setAppointmentForm({ ...appointmentForm, location: v })}
                    fieldType="location"
                    placeholder="e.g. Zoom / Office"
                    className="field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reminder (minutes before)</label>
                  <input
                    type="number"
                    min={0}
                    value={appointmentForm.reminder_minutes}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, reminder_minutes: parseInt(e.target.value || "0") })}
                    className="field"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <InlineAutocomplete
                    as="textarea"
                    value={appointmentForm.notes}
                    onChange={(v) => setAppointmentForm({ ...appointmentForm, notes: v })}
                    fieldType="description"
                    context="appointment notes"
                    rows={2}
                    className="field"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={appointmentForm.auto_follow_up}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, auto_follow_up: e.target.checked })}
                    />
                    Auto-create follow-up deadline after completion
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Follow-up Template (optional)</label>
                  <InlineAutocomplete
                    as="textarea"
                    value={appointmentForm.follow_up_template}
                    onChange={(v) => setAppointmentForm({ ...appointmentForm, follow_up_template: v })}
                    fieldType="description"
                    context="follow up task template"
                    rows={2}
                    className="field"
                  />
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <button type="submit" className="btn-base btn-sm btn-primary">{editingAppointmentId ? "Update" : "Create"}</button>
                  <button type="button" onClick={resetAppointmentForm} className="btn-base btn-sm btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {appointments.length === 0 ? (
            <div className="panel text-center py-16">
              <Clock className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-medium text-slate-600">No appointments yet</h3>
            </div>
          ) : (
            <div className="grid gap-3">
              {appointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  getCaseName={getCaseName}
                  getClientName={getClientName}
                  onDelete={deleteAppointment}
                  onEdit={handleEditAppointment}
                  onStatusChange={updateAppointmentStatus}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DeadlineCard({ dl, getCaseName, priorityColors, toggleDeadline, deleteDeadline, isOverdue }: any) {
  return (
    <div className={`bg-white rounded-xl border ${isOverdue ? "border-red-200" : "border-slate-200"} p-4 flex items-center gap-4 ${dl.is_completed ? "opacity-60" : ""}`}>
      <button onClick={() => toggleDeadline(dl.id, dl.is_completed)}>
        <CheckCircle2 className={`h-6 w-6 ${dl.is_completed ? "text-emerald-500" : isOverdue ? "text-red-400" : "text-slate-300"}`} />
      </button>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className={`font-medium ${dl.is_completed ? "line-through text-slate-400" : isOverdue ? "text-red-700" : "text-slate-800"}`}>{dl.title}</h3>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[dl.priority]}`}>{dl.priority}</span>
          {isOverdue && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">OVERDUE</span>}
        </div>
        {dl.case_id && (
          <p className="text-xs text-blue-500 mt-0.5 flex items-center gap-1"><Briefcase className="h-3 w-3" /> {getCaseName(dl.case_id)}</p>
        )}
        {dl.description && <p className="text-sm text-slate-500 mt-1">{dl.description}</p>}
      </div>
      <div className="text-right flex items-center gap-2">
        <div>
          <p className={`text-sm font-medium ${isOverdue ? "text-red-600" : "text-slate-700"}`}>{new Date(dl.due_date).toLocaleDateString()}</p>
          <p className="text-xs text-slate-400">{new Date(dl.due_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <button onClick={() => deleteDeadline(dl.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function AppointmentCard({ appointment, getCaseName, getClientName, onDelete, onEdit, onStatusChange }: any) {
  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    confirmed: "bg-indigo-100 text-indigo-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-slate-200 text-slate-600",
    missed: "bg-red-100 text-red-700",
  };

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-slate-800">{appointment.title}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[appointment.status] || statusColors.scheduled}`}>
              {appointment.status}
            </span>
          </div>
          {appointment.client_id && <p className="text-xs text-slate-500 mt-1">Client: {getClientName(appointment.client_id)}</p>}
          {appointment.case_id && <p className="text-xs text-blue-500 mt-0.5">Case: {getCaseName(appointment.case_id)}</p>}
          {appointment.location && <p className="text-sm text-slate-500 mt-1">{appointment.location}</p>}
          {appointment.notes && <p className="text-xs text-slate-400 mt-0.5">{appointment.notes}</p>}
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-700">{new Date(appointment.start_time).toLocaleDateString()}</p>
          <p className="text-xs text-slate-400">
            {new Date(appointment.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(appointment.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <div className="mt-2 flex items-center justify-end gap-2">
            <button onClick={() => onEdit(appointment)} className="text-xs text-blue-600 hover:text-blue-700">Edit</button>
            {appointment.status !== "completed" && (
              <button onClick={() => onStatusChange(appointment.id, "completed")} className="text-xs text-emerald-600 hover:text-emerald-700">Complete</button>
            )}
            {appointment.status !== "cancelled" && appointment.status !== "completed" && (
              <button onClick={() => onStatusChange(appointment.id, "cancelled")} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
            )}
            <button onClick={() => onDelete(appointment.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
