"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { FileText, Plus, Brain, Shield, Sparkles, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const docTypes = ["contract", "agreement", "motion", "brief", "letter", "notice", "pleading", "memo", "other"];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
  const [showAnalyze, setShowAnalyze] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const [form, setForm] = useState({ title: "", doc_type: "other", content: "" });
  const [draftForm, setDraftForm] = useState({ doc_type: "contract", context: "" });
  const [analyzeContent, setAnalyzeContent] = useState("");

  useEffect(() => { loadDocuments(); }, []);

  async function loadDocuments() {
    try {
      const data = await api.getDocuments();
      setDocuments(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createDocument(form);
      toast.success("Document created");
      setShowForm(false);
      setForm({ title: "", doc_type: "other", content: "" });
      loadDocuments();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleDraft(e: React.FormEvent) {
    e.preventDefault();
    setAiLoading(true);
    try {
      const doc = await api.draftDocument(draftForm);
      toast.success("Document drafted by AI");
      setShowDraft(false);
      setDraftForm({ doc_type: "contract", context: "" });
      loadDocuments();
    } catch (err: any) { toast.error(err.message); }
    finally { setAiLoading(false); }
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setAiLoading(true);
    try {
      const result = await api.analyzeDocument({ content: analyzeContent });
      setAnalysisResult(result);
      toast.success("Analysis complete");
    } catch (err: any) { toast.error(err.message); }
    finally { setAiLoading(false); }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documents</h1>
          <p className="text-slate-500 mt-1">Create, draft, and analyze legal documents</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowAnalyze(!showAnalyze); setShowDraft(false); setShowForm(false); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium text-sm"
          >
            <Shield className="h-4 w-4" />
            AI Analyze
          </button>
          <button
            onClick={() => { setShowDraft(!showDraft); setShowAnalyze(false); setShowForm(false); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
          >
            <Sparkles className="h-4 w-4" />
            AI Draft
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setShowDraft(false); setShowAnalyze(false); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Plus className="h-4 w-4" />
            New Doc
          </button>
        </div>
      </div>

      {/* AI Analyze Form */}
      {showAnalyze && (
        <div className="bg-white rounded-xl border border-violet-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-violet-600" />
            AI Document Analysis
          </h3>
          <form onSubmit={handleAnalyze}>
            <textarea
              required
              placeholder="Paste the legal document content here for AI analysis..."
              value={analyzeContent}
              onChange={(e) => setAnalyzeContent(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none mb-4"
            />
            <button
              type="submit"
              disabled={aiLoading}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
            >
              {aiLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Analyze Document
            </button>
          </form>

          {analysisResult && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-violet-50 rounded-lg">
                <h4 className="font-semibold text-slate-800 mb-2">Summary</h4>
                <p className="text-sm text-slate-600">{analysisResult.summary}</p>
              </div>
              {analysisResult.key_clauses?.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-slate-800 mb-2">Key Clauses</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {analysisResult.key_clauses.map((c: string, i: number) => (
                      <li key={i} className="text-sm text-slate-600">{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analysisResult.risk_flags?.length > 0 && (
                <div className="p-4 bg-red-50 rounded-lg">
                  <h4 className="font-semibold text-slate-800 mb-2">Risk Flags</h4>
                  {analysisResult.risk_flags.map((r: any, i: number) => (
                    <div key={i} className="mb-2 last:mb-0">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 
                        ${r.risk_level === "high" ? "bg-red-200 text-red-800" : r.risk_level === "medium" ? "bg-amber-200 text-amber-800" : "bg-green-200 text-green-800"}`}>
                        {r.risk_level}
                      </span>
                      <span className="text-sm text-slate-600">{r.explanation}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* AI Draft Form */}
      {showDraft && (
        <div className="bg-white rounded-xl border border-emerald-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            AI Document Drafting
          </h3>
          <form onSubmit={handleDraft} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Document Type</label>
              <select
                value={draftForm.doc_type}
                onChange={(e) => setDraftForm({ ...draftForm, doc_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {docTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Describe what you need</label>
              <textarea
                required
                placeholder="E.g., 'Draft a non-disclosure agreement between Company A and Company B for a software development project, including a 2-year non-compete clause...'"
                value={draftForm.context}
                onChange={(e) => setDraftForm({ ...draftForm, context: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={aiLoading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
            >
              {aiLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Generate Draft
            </button>
          </form>
        </div>
      )}

      {/* Manual Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">New Document</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={form.doc_type}
                  onChange={(e) => setForm({ ...form, doc_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {docTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={8}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Create
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Documents List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-medium text-slate-600">No documents yet</h3>
          <p className="text-slate-400 mt-1">Create a document or use AI to draft one</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold text-slate-800">{doc.title}</h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      {doc.doc_type}
                    </span>
                    <span className="text-xs text-slate-400">v{doc.version}</span>
                  </div>
                  {doc.ai_summary && (
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                      <Brain className="h-3.5 w-3.5 inline mr-1 text-violet-500" />
                      {doc.ai_summary}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-2">
                    Updated {new Date(doc.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
