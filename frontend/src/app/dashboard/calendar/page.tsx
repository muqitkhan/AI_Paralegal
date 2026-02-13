"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Calendar as CalIcon, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

const eventTypes = ["hearing", "meeting", "deposition", "filing", "consultation", "other"];
const priorities = ["low", "medium", "high", "critical"];

export default function CalendarPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"events" | "deadlines">("deadlines");
  const [showEventForm, setShowEventForm] = useState(false);
  const [showDeadlineForm, setShowDeadlineForm] = useState(false);

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
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [ev, dl] = await Promise.all([api.getEvents(), api.getDeadlines()]);
      setEvents(ev);
      setDeadlines(dl);
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
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleCreateDeadline(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createDeadline({
        ...deadlineForm,
        due_date: new Date(deadlineForm.due_date).toISOString(),
      });
      toast.success("Deadline created");
      setShowDeadlineForm(false);
      setDeadlineForm({ title: "", description: "", due_date: "", priority: "medium", reminder_days: 3 });
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function toggleDeadline(id: string, completed: boolean) {
    try {
      await api.updateDeadline(id, { is_completed: !completed });
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  const priorityColors: Record<string, string> = {
    low: "bg-slate-100 text-slate-600",
    medium: "bg-blue-100 text-blue-700",
    high: "bg-amber-100 text-amber-700",
    critical: "bg-red-100 text-red-700",
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Calendar & Deadlines</h1>
          <p className="text-slate-500 mt-1">Track court dates, filings, and important deadlines</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit mb-6">
        <button
          onClick={() => setActiveTab("deadlines")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "deadlines" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
        >
          <AlertTriangle className="h-4 w-4 inline mr-1.5" />
          Deadlines
        </button>
        <button
          onClick={() => setActiveTab("events")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "events" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
        >
          <CalIcon className="h-4 w-4 inline mr-1.5" />
          Events
        </button>
      </div>

      {activeTab === "deadlines" && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowDeadlineForm(!showDeadlineForm)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              <Plus className="h-4 w-4" />
              New Deadline
            </button>
          </div>

          {showDeadlineForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">New Deadline</h3>
              <form onSubmit={handleCreateDeadline} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                  <input
                    required
                    value={deadlineForm.title}
                    onChange={(e) => setDeadlineForm({ ...deadlineForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date *</label>
                  <input
                    required
                    type="datetime-local"
                    value={deadlineForm.due_date}
                    onChange={(e) => setDeadlineForm({ ...deadlineForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={deadlineForm.priority}
                    onChange={(e) => setDeadlineForm({ ...deadlineForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Remind (days before)</label>
                  <input
                    type="number"
                    value={deadlineForm.reminder_days}
                    onChange={(e) => setDeadlineForm({ ...deadlineForm, reminder_days: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    value={deadlineForm.description}
                    onChange={(e) => setDeadlineForm({ ...deadlineForm, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Create</button>
                  <button type="button" onClick={() => setShowDeadlineForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {deadlines.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <AlertTriangle className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-medium text-slate-600">No deadlines yet</h3>
            </div>
          ) : (
            <div className="grid gap-3">
              {deadlines.map((dl) => (
                <div key={dl.id} className={`bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 ${dl.is_completed ? "opacity-60" : ""}`}>
                  <button onClick={() => toggleDeadline(dl.id, dl.is_completed)}>
                    <CheckCircle2 className={`h-6 w-6 ${dl.is_completed ? "text-emerald-500" : "text-slate-300"}`} />
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-medium ${dl.is_completed ? "line-through text-slate-400" : "text-slate-800"}`}>{dl.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[dl.priority]}`}>
                        {dl.priority}
                      </span>
                    </div>
                    {dl.description && <p className="text-sm text-slate-500 mt-1">{dl.description}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">
                      {new Date(dl.due_date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(dl.due_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "events" && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowEventForm(!showEventForm)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              <Plus className="h-4 w-4" />
              New Event
            </button>
          </div>

          {showEventForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">New Event</h3>
              <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                  <input
                    required
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={eventForm.event_type}
                    onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {eventTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start *</label>
                  <input
                    required
                    type="datetime-local"
                    value={eventForm.start_time}
                    onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End *</label>
                  <input
                    required
                    type="datetime-local"
                    value={eventForm.end_time}
                    onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <input
                    value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Create</button>
                  <button type="button" onClick={() => setShowEventForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {events.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <CalIcon className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-medium text-slate-600">No events yet</h3>
            </div>
          ) : (
            <div className="grid gap-3">
              {events.map((ev) => (
                <div key={ev.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-800">{ev.title}</h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {ev.event_type}
                        </span>
                      </div>
                      {ev.location && <p className="text-sm text-slate-500 mt-1">{ev.location}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700">
                        {new Date(ev.start_time).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(ev.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -
                        {new Date(ev.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
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
