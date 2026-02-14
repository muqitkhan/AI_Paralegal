"use client";

import { useState, useRef } from "react";
import { Upload, FileUp, X, AlertCircle, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

interface FileImportProps {
  onImport: (data: any[]) => Promise<{ created: number; updated?: number; errors: string[] }>;
  sampleFields: string[];
  entityName: string;
}

function parseCSV(text: string): any[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const obj: any = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || "";
    });
    rows.push(obj);
  }
  return rows;
}

export default function FileImport({ onImport, sampleFields, entityName }: FileImportProps) {
  const [show, setShow] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; updated?: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        let data: any[];
        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(text);
          data = Array.isArray(parsed) ? parsed : parsed.data || [parsed];
        } else {
          data = parseCSV(text);
        }
        setPreview(data.slice(0, 50));
      } catch {
        toast.error("Failed to parse file. Use CSV or JSON format.");
        setPreview([]);
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (preview.length === 0) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await onImport(preview);
      setResult(res);
      const parts: string[] = [];
      if (res.created > 0) parts.push(`${res.created} created`);
      if (res.updated && res.updated > 0) parts.push(`${res.updated} updated`);
      if (parts.length > 0) {
        toast.success(`${entityName}s: ${parts.join(", ")}`);
      }
      if (res.errors?.length > 0) {
        toast.error(`${res.errors.length} row(s) had errors`);
      }
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setPreview([]);
    setFileName("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-blue-300 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-colors"
      >
        <Upload className="h-4 w-4" /> Import {entityName}s
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <FileUp className="h-4 w-4 text-blue-500" /> Import {entityName}s
        </h3>
        <button onClick={() => { setShow(false); reset(); }} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs text-slate-500 mb-3">
        Upload a CSV or JSON file. Expected fields: <span className="font-medium text-slate-600">{sampleFields.join(", ")}</span>
      </p>

      <div className="flex items-center gap-3 mb-4">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.json"
          onChange={handleFile}
          className="text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
        />
        {fileName && (
          <span className="text-xs text-slate-500">{fileName}</span>
        )}
      </div>

      {preview.length > 0 && (
        <>
          <div className="mb-3 bg-slate-50 rounded-lg p-3 max-h-48 overflow-auto">
            <p className="text-xs font-medium text-slate-600 mb-2">Preview ({preview.length} rows)</p>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr>
                    {Object.keys(preview[0]).map((key) => (
                      <th key={key} className="text-left pr-3 pb-1 font-medium text-slate-500 whitespace-nowrap">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="pr-3 py-0.5 text-slate-600 whitespace-nowrap max-w-[200px] truncate">
                          {String(val ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.length > 5 && <p className="text-[10px] text-slate-400 mt-1">...and {preview.length - 5} more rows</p>}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {importing ? "Importing..." : `Import ${preview.length} ${entityName}(s)`}
            </button>
            <button onClick={reset} className="px-3 py-2 border border-slate-200 rounded-lg text-xs hover:bg-slate-50">
              Clear
            </button>
          </div>
        </>
      )}

      {result && (
        <div className="mt-3 space-y-2">
          {(result.created > 0 || (result.updated && result.updated > 0)) && (
            <div className="flex items-center gap-2 text-xs text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              {result.created > 0 && <span>{result.created} {entityName}(s) created</span>}
              {result.created > 0 && result.updated && result.updated > 0 && <span>·</span>}
              {result.updated && result.updated > 0 && <span>{result.updated} {entityName}(s) updated</span>}
            </div>
          )}
          {result.errors?.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs font-medium text-red-600 flex items-center gap-1 mb-1">
                <AlertCircle className="h-3.5 w-3.5" /> {result.errors.length} error(s)
              </p>
              <ul className="text-[11px] text-red-500 space-y-0.5">
                {result.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                {result.errors.length > 5 && <li>...and {result.errors.length - 5} more</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
