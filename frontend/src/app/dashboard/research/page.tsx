"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Search, Brain, BookOpen, Scale, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const areasOfLaw = [
  "Constitutional Law", "Criminal Law", "Civil Procedure", "Contract Law",
  "Tort Law", "Property Law", "Family Law", "Corporate Law",
  "Employment Law", "Immigration Law", "Tax Law", "Intellectual Property",
  "Environmental Law", "International Law",
];

export default function ResearchPage() {
  const [query, setQuery] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [areaOfLaw, setAreaOfLaw] = useState("");
  const [includeCaseLaw, setIncludeCaseLaw] = useState(true);
  const [includeStatutes, setIncludeStatutes] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleResearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await api.doResearch({
        query,
        jurisdiction: jurisdiction || undefined,
        area_of_law: areaOfLaw || undefined,
        include_case_law: includeCaseLaw,
        include_statutes: includeStatutes,
      });
      setResult(res);
    } catch (err: any) {
      toast.error(err.message || "Research failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Brain className="h-7 w-7 text-violet-600" />
          AI Legal Research
        </h1>
        <p className="text-slate-500 mt-1">
          Ask legal questions and get AI-powered research with relevant case law and statutes
        </p>
      </div>

      {/* Research Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <form onSubmit={handleResearch} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Research Query *</label>
            <textarea
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="E.g., 'What are the legal requirements for a valid non-compete agreement in California?' or 'Analyze the doctrine of promissory estoppel in contract law'"
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Jurisdiction</label>
              <input
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                placeholder="E.g., California, Federal, UK"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Area of Law</label>
              <select
                value={areaOfLaw}
                onChange={(e) => setAreaOfLaw(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
              >
                <option value="">Any</option>
                {areasOfLaw.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCaseLaw}
                  onChange={(e) => setIncludeCaseLaw(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-slate-700">Case Law</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeStatutes}
                  onChange={(e) => setIncludeStatutes(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-slate-700">Statutes</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 
                       disabled:opacity-50 transition-colors font-medium text-sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "Researching..." : "Research"}
          </button>
        </form>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-violet-600" />
              Research Summary
            </h2>
            <p className="text-slate-600 leading-relaxed">{result.summary}</p>
          </div>

          {/* Key Points */}
          {result.key_points?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-3">Key Points</h2>
              <ul className="space-y-2">
                {result.key_points.map((point: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Relevant Cases */}
          {result.relevant_cases?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-600" />
                Relevant Cases
              </h2>
              <div className="space-y-3">
                {result.relevant_cases.map((c: any, i: number) => (
                  <div key={i} className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-slate-800">{c.case_name || c.name}</h3>
                    {c.citation && <p className="text-xs text-blue-600 mt-0.5">{c.citation}</p>}
                    <p className="text-sm text-slate-600 mt-1">{c.relevance || c.key_holding}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Relevant Statutes */}
          {result.relevant_statutes?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-3">Relevant Statutes</h2>
              <div className="space-y-3">
                {result.relevant_statutes.map((s: any, i: number) => (
                  <div key={i} className="p-4 bg-emerald-50 rounded-lg">
                    <h3 className="font-semibold text-slate-800">{s.statute || s.name}</h3>
                    {s.section && <p className="text-xs text-emerald-600 mt-0.5">{s.section}</p>}
                    <p className="text-sm text-slate-600 mt-1">{s.relevance}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-3">Recommendations</h2>
              <ul className="space-y-2">
                {result.recommendations.map((rec: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <strong>Disclaimer:</strong> {result.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
}
