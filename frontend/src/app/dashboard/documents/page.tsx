"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { FileText, Plus, Brain, Shield, Sparkles, Loader2, Briefcase, Upload, Download, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import InlineAutocomplete from "@/components/InlineAutocomplete";
import FileImport from "@/components/FileImport";
import { downloadTextFile, documentToText } from "@/lib/download";

const PAGE_SIZE = 25;

const docTypes = ["contract", "agreement", "motion", "brief", "letter", "notice", "pleading", "memo", "other"];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreDocuments, setHasMoreDocuments] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
  const [showAnalyze, setShowAnalyze] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const [form, setForm] = useState({ title: "", doc_type: "other", content: "", case_id: "" });
  const [draftForm, setDraftForm] = useState({ doc_type: "contract", context: "", template_id: "", case_id: "" });
  const [draftPreview, setDraftPreview] = useState<{ title: string; content: string } | null>(null);
  const [draftEditing, setDraftEditing] = useState({ title: "", content: "" });
  const [analyzeSource, setAnalyzeSource] = useState<"existing" | "paste">("existing");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [analyzeContent, setAnalyzeContent] = useState("");

  useEffect(() => { loadData(true); }, []);

  async function loadData(reset = true) {
    const offset = reset ? 0 : documents.length;
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const docs = await api.getDocuments({ limit: PAGE_SIZE, offset });
      setDocuments(prev => (reset ? docs : [...prev, ...docs]));
      setHasMoreDocuments(docs.length === PAGE_SIZE);
    } catch (e) { console.error("Failed to load documents", e); }
    if (reset) {
      try {
        const cs = await api.getCases();
        setCases(cs);
      } catch (e) { console.error("Failed to load cases", e); }
      try {
        const tpls = await api.getTemplates();
        setTemplates(tpls);
      } catch (e) { console.error("Failed to load templates", e); }
    }
    setLoading(false);
    setLoadingMore(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: any = { ...form };
      if (!payload.case_id) delete payload.case_id;
      await api.createDocument(payload);
      toast.success("Document created");
      setShowForm(false);
      setForm({ title: "", doc_type: "other", content: "", case_id: "" });
      loadData(true);
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleDocAutoFill() {
    setAutoFilling(true);
    try {
      const caseName = form.case_id ? cases.find(c => c.id === form.case_id)?.title : "";
      const ctx = caseName ? `Related case: ${caseName}, document type: ${form.doc_type}` : `document type: ${form.doc_type}`;
      const result = await api.aiAutoFill("document", ["title", "content"], form, ctx);
      setForm(prev => ({
        ...prev,
        title: result.title || prev.title,
        content: result.content || prev.content,
      }));
      toast.success("Form auto-filled by AI");
    } catch (err: any) { toast.error(err.message || "Auto-fill failed"); }
    finally { setAutoFilling(false); }
  }

  async function handleDraftGenerate(e: React.FormEvent) {
    e.preventDefault();
    setAiLoading(true);
    setDraftPreview(null);
    try {
      let context = draftForm.context || "";
      // Auto-enrich context with case details if a case is selected
      if (draftForm.case_id) {
        const selectedCase = cases.find(c => c.id === draftForm.case_id);
        if (selectedCase) {
          const caseInfo = `Case: ${selectedCase.title} (${selectedCase.case_type}, ${selectedCase.status})\nCourt: ${selectedCase.court || "N/A"}\nJudge: ${selectedCase.judge || "N/A"}`;
          context = context ? `${caseInfo}\n\n${context}` : caseInfo;
        }
      }
      const result = await api.draftPreview({
        doc_type: draftForm.doc_type,
        context,
        template_id: draftForm.template_id || undefined,
      });
      setDraftPreview(result);
      setDraftEditing({ title: result.title, content: result.content });
      toast.success("Draft generated! Review and edit below, then save.");
    } catch (err: any) { toast.error(err.message); }
    finally { setAiLoading(false); }
  }

  async function handleDraftSave() {
    if (!draftEditing.title.trim() || !draftEditing.content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    try {
      const payload: any = {
        title: draftEditing.title,
        doc_type: draftForm.doc_type,
        content: draftEditing.content,
      };
      if (draftForm.case_id) payload.case_id = draftForm.case_id;
      await api.createDocument(payload);
      toast.success("Document saved");
      setShowDraft(false);
      setDraftForm({ doc_type: "contract", context: "", template_id: "", case_id: "" });
      setDraftPreview(null);
      setDraftEditing({ title: "", content: "" });
      loadData(true);
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setAiLoading(true);
    try {
      let payload: any = {};
      if (analyzeSource === "existing" && selectedDocId) {
        payload = { document_id: selectedDocId };
      } else {
        payload = { content: analyzeContent };
      }
      const result = await api.analyzeDocument(payload);
      setAnalysisResult(result);
      toast.success("Analysis complete");
    } catch (err: any) { toast.error(err.message); }
    finally { setAiLoading(false); }
  }

  // Find case name for a given case_id
  const getCaseName = (caseId: string) => cases.find(c => c.id === caseId)?.title || "";

  async function handleDeleteDoc(id: string) {
    if (!confirm("Delete this document?")) return;
    try { await api.deleteDocument(id); toast.success("Document deleted"); loadData(true); } catch (err: any) { toast.error(err.message); }
  }

  async function handleDownloadDoc(doc: any) {
    // If we already have content, use it; otherwise fetch the full document
    let content = doc.content;
    if (!content) {
      try {
        const full = await api.getDocument(doc.id);
        content = full.content;
      } catch { content = "(Content not available)"; }
    }
    downloadTextFile(
      `${doc.title || "document"}.txt`,
      documentToText({ ...doc, content }, getCaseName(doc.case_id))
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documents</h1>
          <p className="text-slate-500 mt-1">Create, draft, and analyze legal documents</p>
        </div>
        <div className="flex gap-2">
          <FileImport
            onImport={(data) => api.importDocuments(data).then((r) => { loadData(); return r; })}
            sampleFields={["title", "doc_type", "content", "case_id"]}
            entityName="document"
          />
          <button
            onClick={() => { setShowAnalyze(!showAnalyze); setShowDraft(false); setShowForm(false); }}
            className="btn-base btn-md btn-violet"
          >
            <Shield className="h-4 w-4" />
            AI Analyze
          </button>
          <button
            onClick={() => { setShowDraft(!showDraft); setShowAnalyze(false); setShowForm(false); }}
            className="btn-base btn-md btn-emerald"
          >
            <Sparkles className="h-4 w-4" />
            AI Draft
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setShowDraft(false); setShowAnalyze(false); }}
            className="btn-base btn-md btn-primary"
          >
            <Plus className="h-4 w-4" />
            New Doc
          </button>
        </div>
      </div>

      {/* AI Analyze Form */}
      {showAnalyze && (
        <div className="panel border-violet-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-slate-600" />
            AI Document Analysis
          </h3>

          {/* Source toggle */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit mb-4">
            <button
              type="button"
              onClick={() => setAnalyzeSource("existing")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${analyzeSource === "existing" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}
            >
              Choose Existing Document
            </button>
            <button
              type="button"
              onClick={() => setAnalyzeSource("paste")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${analyzeSource === "paste" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}
            >
              Paste Content
            </button>
          </div>

          <form onSubmit={handleAnalyze}>
            {analyzeSource === "existing" ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Document</label>
                <select
                  required
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="field"
                >
                  <option value="">-- Pick a document to analyze --</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title} ({doc.doc_type})
                    </option>
                  ))}
                </select>
                {selectedDocId && (
                  <p className="text-xs text-slate-500 mt-1">
                    The AI will analyze the full content of the selected document.
                  </p>
                )}
              </div>
            ) : (
              <textarea
                required
                placeholder="Paste the legal document content here for AI analysis..."
                value={analyzeContent}
                onChange={(e) => setAnalyzeContent(e.target.value)}
                rows={6}
                className="field mb-4"
              />
            )}
            <button
              type="submit"
              disabled={aiLoading || (analyzeSource === "existing" && !selectedDocId)}
              className="btn-base btn-sm btn-violet"
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

      {/* AI Draft Form — 2-step: Generate → Review/Edit → Save */}
      {showDraft && (
        <div className="panel border-emerald-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-slate-600" />
            AI Document Drafting
          </h3>

          {/* Step 1: Options + Generate */}
          <form onSubmit={handleDraftGenerate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Document Type *</label>
                <select
                  value={draftForm.doc_type}
                  onChange={(e) => setDraftForm({ ...draftForm, doc_type: e.target.value })}
                  className="field"
                >
                  {docTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Related Case (optional)</label>
                <select
                  value={draftForm.case_id}
                  onChange={(e) => setDraftForm({ ...draftForm, case_id: e.target.value })}
                  className="field"
                >
                  <option value="">No case</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Template (optional)</label>
                <select
                  value={draftForm.template_id}
                  onChange={(e) => setDraftForm({ ...draftForm, template_id: e.target.value })}
                  className="field"
                >
                  <option value="">No template</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Additional instructions <span className="text-slate-400 font-normal">(optional — AI will auto-generate if left empty)</span>
              </label>
              <InlineAutocomplete
                as="textarea"
                value={draftForm.context}
                onChange={(v) => setDraftForm({ ...draftForm, context: v })}
                fieldType="description"
                context={`drafting a ${draftForm.doc_type} legal document`}
                placeholder="Leave empty for a standard draft, or add specifics like parties, clauses, jurisdiction..."
                rows={2}
                className="field"
              />
            </div>
            <button
              type="submit"
              disabled={aiLoading}
              className="btn-base btn-md btn-emerald"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Draft...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Draft
                </>
              )}
            </button>
          </form>

          {/* Step 2: Editable Preview + Save */}
          {draftPreview && (
            <div className="mt-6 border-t border-emerald-100 pt-6">
              <h4 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Review &amp; Edit Draft
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
                  <input
                    type="text"
                    value={draftEditing.title}
                    onChange={(e) => setDraftEditing({ ...draftEditing, title: e.target.value })}
                    className="field font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Content</label>
                  <textarea
                    value={draftEditing.content}
                    onChange={(e) => setDraftEditing({ ...draftEditing, content: e.target.value })}
                    rows={16}
                    className="field font-mono leading-relaxed"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleDraftSave}
                  className="btn-base btn-md btn-primary"
                >
                  Save Document
                </button>
                <button
                  onClick={() => handleDraftGenerate({ preventDefault: () => {} } as React.FormEvent)}
                  disabled={aiLoading}
                  className="px-4 py-2.5 border border-emerald-300 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50 disabled:opacity-50 flex items-center gap-2"
                >
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Regenerate
                </button>
                <button
                  onClick={() => { setDraftPreview(null); setDraftEditing({ title: "", content: "" }); }}
                  className="btn-base btn-md btn-secondary"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Create Form */}
      {showForm && (
        <div className="panel p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center justify-between">
            <span>New Document</span>
          </h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <InlineAutocomplete
                  required
                  value={form.title}
                  onChange={(v) => setForm({ ...form, title: v })}
                  fieldType="document_title"
                  placeholder="Document title"
                  className="field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={form.doc_type}
                  onChange={(e) => setForm({ ...form, doc_type: e.target.value })}
                  className="field"
                >
                  {docTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Related Case</label>
                <select
                  value={form.case_id}
                  onChange={(e) => setForm({ ...form, case_id: e.target.value })}
                  className="field"
                >
                  <option value="">No case</option>
                  {cases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-slate-700 mb-1">
                Content
                <button type="button" onClick={handleDocAutoFill} disabled={autoFilling}
                  className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-medium hover:bg-slate-200 disabled:opacity-50 border border-slate-200 transition-colors">
                  {autoFilling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  AI Auto-Fill All
                </button>
              </label>
              <div className="mb-2">
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:text-slate-800">
                  <Upload className="h-3.5 w-3.5" />
                  Upload .txt file
                  <input type="file" accept=".txt,.md" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setForm({ ...form, content: ev.target?.result as string });
                      toast.success("File content loaded");
                    };
                    reader.readAsText(file);
                  }} />
                </label>
              </div>
              <InlineAutocomplete
                as="textarea"
                value={form.content}
                onChange={(v) => setForm({ ...form, content: v })}
                fieldType="document_content"
                context={`legal ${form.doc_type} document`}
                rows={8}
                placeholder="Document content..."
                className="field font-mono"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-base btn-sm btn-primary">
                Create
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-base btn-sm btn-secondary">
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
        <div className="panel text-center py-16">
          <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-medium text-slate-600">No documents yet</h3>
          <p className="text-slate-400 mt-1">Create a document or use AI to draft one</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <div key={doc.id} className="panel defer-render hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-slate-500" />
                    <h3 className="text-[15px] font-semibold text-slate-800">{doc.title}</h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      {doc.doc_type}
                    </span>
                    <span className="text-xs text-slate-400">v{doc.version}</span>
                  </div>
                  {doc.case_id && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      {getCaseName(doc.case_id)}
                    </p>
                  )}
                  {doc.ai_summary && (
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">
                      <Brain className="h-3.5 w-3.5 inline mr-1 text-slate-500" />
                      {doc.ai_summary}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-2">
                    Updated {new Date(doc.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleDownloadDoc(doc)} className="p-1.5 text-slate-400 hover:text-emerald-500 transition-colors" title="Download"><Download className="h-4 w-4" /></button>
                  <button onClick={() => handleDeleteDoc(doc.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
          {hasMoreDocuments && (
            <div className="flex justify-center pt-1">
              <button
                onClick={() => loadData(false)}
                disabled={loadingMore}
                className="btn-base btn-sm btn-secondary"
              >
                {loadingMore ? "Loading..." : "Load more documents"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
