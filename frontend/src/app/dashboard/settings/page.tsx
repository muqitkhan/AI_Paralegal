"use client";

import { useAuth } from "@/lib/store";
import { useState } from "react";
import { Settings, User, Building2, Shield } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "",
    firm_name: "",
    bar_number: "",
    phone: "",
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Settings saved (connect backend to persist)");
  }

  return (
    <div className="animate-fade-in max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="panel p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600" />
          Profile
        </h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              value={user?.email || ""}
              disabled
              className="field-muted"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="field"
            />
          </div>
          <button type="submit" className="btn-base btn-sm btn-primary">
            Save Profile
          </button>
        </form>
      </div>

      {/* Firm Information */}
      <div className="panel p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-emerald-600" />
          Firm Information
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Firm Name</label>
            <input
              value={form.firm_name}
              onChange={(e) => setForm({ ...form, firm_name: e.target.value })}
              className="field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bar Number</label>
            <input
              value={form.bar_number}
              onChange={(e) => setForm({ ...form, bar_number: e.target.value })}
              className="field"
            />
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div className="panel p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-violet-600" />
          API Configuration
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Configure API keys for AI features. Set these in your backend .env file.
        </p>
        <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-600 font-mono">
          <p>GROQ_API_KEY=gsk_...</p>
          <p>JWT_SECRET_KEY=...</p>
        </div>
      </div>
    </div>
  );
}
