"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { BookOpen, Search, Scale, Briefcase, FileText, Loader2, ChevronDown, ChevronUp, Sparkles, History, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import InlineAutocomplete from "@/components/InlineAutocomplete";

const areasOfLaw = [
  "constitutional", "criminal", "civil", "corporate", "contract",
  "family", "immigration", "intellectual_property", "labor",
  "real_estate", "tax", "environmental", "international", "other",
];

interface ResearchResult {
  id: string;
  query: string;
  jurisdiction: string;
  area_of_law: string;
  case_title?: string;
  data: any;
  timestamp: string;
}

export default function ResearchPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<ResearchResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeMode, setActiveMode] = useState<"manual" | "case" | "document">("manual");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [docSummary, setDocSummary] = useState("");

  const [form, setForm] = useState({
    query: "",
    jurisdiction: "",
    area_of_law: "other",
    include_case_law: true,
    include_statutes: true,
  });

  useEffect(() => {
    loadData();
    // Load research history from localStorage
    try {
      const saved = localStorage.getItem("research_history");
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  async function loadData() {
    try {
      const [cs, docs] = await Promise.all([
        api.getCases().catch(() => []),
        api.getDocuments().catch(() => []),
      ]);
      setCases(cs); setDocuments(docs);
    } catch (e) { console.error(e); }
    finally { setDataLoading(false); }
  }

  // Auto-populate form from case context
  function selectCase(caseId: string) {
    setSelectedCaseId(caseId);
    const c = cases.find(cs => cs.id === caseId);
    if (!c) return;
    const caseContext = [
      c.title,
      c.case_type ? `Case type: ${c.case_type}` : "",
      c.description || "",
      c.court ? `Court: ${c.court}` : "",
      c.judge ? `Judge: ${c.judge}` : "",
      c.opposing_counsel ? `Opposing counsel: ${c.opposing_counsel}` : "",
    ].filter(Boolean).join(". ");
    setForm(prev => ({
      ...prev,
      query: `Legal research for case: ${caseContext}`,
      area_of_law: mapCaseTypeToArea(c.case_type) || prev.area_of_law,
    }));
  }

  function mapCaseTypeToArea(caseType: string): string {
    const map: Record<string, string> = {
      civil: "civil", criminal: "criminal", corporate: "corporate",
      family: "family", real_estate: "real_estate", immigration: "immigration",
      intellectual_property: "intellectual_property", labor: "labor", tax: "tax",
    };
    return map[caseType] || "other";
  }

  // Summarize a document and use as research context
  async function summarizeDocument(docId: string) {
    setSelectedDocId(docId);
    const doc = documents.find(d => d.id === docId);
    if (!doc?.content) { toast.error("Document has no content"); return; }
    setSummarizing(true);
    setDocSummary("");
    try {
      const res = await api.summarizeText(doc.content);
      const summaryText = typeof res === "string" ? res : res.summary;
      setDocSummary(summaryText);
      setForm(prev => ({
        ...prev,
        query: `Based on this document summary, research applicable laws and precedents:\n\n${summaryText}`,
      }));
      toast.success("Document summarized — query updated");
    } catch (err: any) { toast.error(err.message); }
    finally { setSummarizing(false); }
  }

  async function handleResearch(e: React.FormEvent) {
    e.preventDefault();
    if (!form.query.trim()) { toast.error("Enter a research query"); return; }
    setLoading(true);
    setResult(null);
    try {
      const data = await api.doResearch(form);
      setResult(data);
      // Save to history
      const c = cases.find(cs => cs.id === selectedCaseId);
      const entry: ResearchResult = {
        id: Date.now().toString(),
        query: form.query.slice(0, 100),
        jurisdiction: form.jurisdiction,
        area_of_law: form.area_of_law,
        case_title: c?.title,
        data,
        timestamp: new Date().toISOString(),
      };
      const newHistory = [entry, ...history].slice(0, 20);
      setHistory(newHistory);
      localStorage.setItem("research_history", JSON.stringify(newHistory));
      toast.success("Research complete");
    } catch (err: any) { toast.error(err.message || "Research failed"); }
    finally { setLoading(false); }
  }

  function loadFromHistory(entry: ResearchResult) {
    setResult(entry.data);
    setShowHistory(false);
    toast.success("Loaded from history");
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem("research_history");
    toast.success("History cleared");
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">AI Legal Research</h1>
          <p className="text-slate-500 mt-1">AI-powered research with case law and statute analysis</p>
        </div>
        {history.length > 0 && (
          <button onClick={() => setShowHistory(!showHistory)}
            className="btn-base btn-sm btn-secondary">
            <History className="h-4 w-4" /> History ({history.length})
          </button>
        )}
      </div>

      {/* Research History */}
      {showHistory && history.length > 0 && (
        <div className="panel mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Research History</h3>
            <button onClick={clearHistory} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
              <Trash2 className="h-3 w-3" /> Clear
            </button>
          </div>
          <div className="grid gap-2 max-h-60 overflow-y-auto">
            {history.map(h => (
              <button key={h.id} onClick={() => loadFromHistory(h)}
                className="text-left p-3 rounded-lg border border-slate-100 hover:bg-blue-50 transition-colors">
                <p className="text-sm font-medium text-slate-700 truncate">{h.query}</p>
                <div className="flex gap-3 mt-1 text-xs text-slate-400">
                  {h.case_title && <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {h.case_title}</span>}
                  <span>{h.area_of_law.replace("_", " ")}</span>
                  <span>{new Date(h.timestamp).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mode Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {[
          { key: "manual", label: "Manual Query", icon: Search },
          { key: "case", label: "From Case", icon: Briefcase },
          { key: "document", label: "From Document", icon: FileText },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveMode(key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeMode === key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="panel p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" /> Research Query
          </h3>

          {/* Case selector */}
          {activeMode === "case" && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Case</label>
              <select value={selectedCaseId} onChange={(e) => selectCase(e.target.value)}
                className="field">
                <option value="">Choose a case...</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>{c.title} ({c.case_type})</option>
                ))}
              </select>
              {selectedCaseId && (
                <p className="text-xs text-emerald-600 mt-1">Case context loaded into query below</p>
              )}
            </div>
          )}

          {/* Document selector */}
          {activeMode === "document" && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Document or Upload</label>
              <select value={selectedDocId} onChange={(e) => summarizeDocument(e.target.value)}
                className="field mb-2">
                <option value="">Choose a document...</option>
                {documents.filter(d => d.content).map(d => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
              {/* Upload text file */}
              <div className="border border-dashed border-slate-300 rounded-lg p-3 text-center">
                <Upload className="h-5 w-5 mx-auto text-slate-400 mb-1" />
                <p className="text-xs text-slate-500 mb-2">Or upload a .txt file to analyze</p>
                <input type="file" accept=".txt,.md,.csv" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const text = ev.target?.result as string;
                    setForm(prev => ({
                      ...prev,
                      query: `Analyze and research applicable laws for this document:\n\n${text.slice(0, 3000)}`,
                    }));
                    toast.success("File loaded into research query");
                  };
                  reader.readAsText(file);
                }} className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-600" />
              </div>
              {summarizing && (
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Summarizing document...
                </p>
              )}
              {docSummary && (
                <div className="mt-2 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 max-h-24 overflow-y-auto">
                  {docSummary}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleResearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Research Query *</label>
              <InlineAutocomplete as="textarea" required rows={5} value={form.query} onChange={(v) => setForm({ ...form, query: v })}
                fieldType="research_query" context={form.area_of_law}
                placeholder="Describe your legal research question..."
                className="field resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Jurisdiction</label>
                <InlineAutocomplete value={form.jurisdiction} onChange={(v) => setForm({ ...form, jurisdiction: v })}
                  fieldType="jurisdiction"
                  placeholder="e.g. California, Federal"
                  className="field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Area of Law</label>
                <select value={form.area_of_law} onChange={(e) => setForm({ ...form, area_of_law: e.target.value })}
                  className="field">
                  {areasOfLaw.map((a) => <option key={a} value={a}>{a.replace("_", " ")}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={form.include_case_law}
                  onChange={(e) => setForm({ ...form, include_case_law: e.target.checked })} className="rounded" />
                Include Case Law
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={form.include_statutes}
                  onChange={(e) => setForm({ ...form, include_statutes: e.target.checked })} className="rounded" />
                Include Statutes
              </label>
            </div>
            <button type="submit" disabled={loading}
              className="btn-base btn-md btn-primary w-full">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Researching...</> : <><Search className="h-4 w-4" /> Research</>}
            </button>
          </form>
        </div>

        {/* Right: Results */}
        <div>
          {!result && !loading && (
            <div className="panel p-12 text-center">
              <BookOpen className="h-16 w-16 mx-auto text-slate-200 mb-4" />
              <h3 className="text-lg font-medium text-slate-500">Start a research query</h3>
              <p className="text-slate-400 mt-1 text-sm">
                {activeMode === "case" ? "Select a case to auto-fill context" :
                 activeMode === "document" ? "Select a document to analyze" :
                 "Enter your legal question to get AI-powered analysis"}
              </p>
            </div>
          )}

          {loading && (
            <div className="panel p-12 text-center">
              <Loader2 className="h-12 w-12 mx-auto text-blue-500 animate-spin mb-4" />
              <p className="text-slate-600 font-medium">Analyzing legal sources...</p>
              <p className="text-slate-400 text-sm mt-1">This may take a moment</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              {/* Summary */}
              {result.summary && (
                <div className="panel">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Scale className="h-4 w-4 text-blue-500" /> Summary
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{result.summary}</p>
                </div>
              )}

              {/* Key Points */}
              {result.key_points?.length > 0 && (
                <div className="panel">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Key Points</h3>
                  <ul className="space-y-2">
                    {result.key_points.map((p: any, i: number) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-600">
                        <span className="text-blue-500 font-bold mt-0.5">{i + 1}.</span>
                        <span>{typeof p === "string" ? p : (p.point || p.description || p.text || JSON.stringify(p))}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Relevant Cases */}
              {result.relevant_cases?.length > 0 && (
                <div className="panel">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Relevant Cases</h3>
                  <ul className="space-y-3">
                    {result.relevant_cases.map((c: any, i: number) => (
                      <li key={i} className="text-sm text-slate-600 pl-3 border-l-2 border-blue-200">
                        {typeof c === "string" ? c : (
                          <div>
                            <p className="font-medium text-slate-700">{c.case_name || c.name || c.title}</p>
                            {c.citation && <p className="text-xs text-slate-400">{c.citation}</p>}
                            {c.relevance && <p className="text-xs text-blue-600 mt-0.5">{c.relevance}</p>}
                            {c.key_holding && <p className="text-xs text-slate-500 mt-0.5 italic">{c.key_holding}</p>}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Statutes */}
              {result.relevant_statutes?.length > 0 && (
                <div className="panel">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Relevant Statutes</h3>
                  <ul className="space-y-3">
                    {result.relevant_statutes.map((s: any, i: number) => (
                      <li key={i} className="text-sm text-slate-600 pl-3 border-l-2 border-emerald-200">
                        {typeof s === "string" ? s : (
                          <div>
                            <p className="font-medium text-slate-700">{s.statute_name || s.name || s.title}</p>
                            {s.citation && <p className="text-xs text-slate-400">{s.citation}</p>}
                            {s.relevance && <p className="text-xs text-emerald-600 mt-0.5">{s.relevance}</p>}
                            {s.key_provision && <p className="text-xs text-slate-500 mt-0.5 italic">{s.key_provision}</p>}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations?.length > 0 && (
                <div className="panel border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-700 mb-2">Recommendations</h3>
                  <ul className="space-y-2">
                    {result.recommendations.map((r: any, i: number) => (
                      <li key={i} className="text-sm text-slate-600 flex gap-2">
                        <span className="text-blue-500">→</span>
                        <span>{typeof r === "string" ? r : (r.recommendation || r.text || r.description || JSON.stringify(r))}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Disclaimer */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs text-amber-700">
                  <strong>Disclaimer:</strong> {result.disclaimer || "This AI-generated research is for informational purposes only. Always verify through official legal databases and consult qualified legal professionals."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
