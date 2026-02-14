"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Sparkles } from "lucide-react";

interface AutoSuggestInputProps {
  value: string;
  onChange: (value: string) => void;
  fieldType?: string;
  context?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  as?: "input" | "textarea";
  rows?: number;
}

export default function AutoSuggestInput({
  value,
  onChange,
  fieldType = "general",
  context = "",
  placeholder = "",
  className = "",
  required = false,
  as = "input",
  rows = 3,
}: AutoSuggestInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(
    async (text: string) => {
      if (text.length < 2) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const res = await api.aiSuggest(text, fieldType, context);
        const items = res.suggestions || [];
        setSuggestions(items.slice(0, 5));
        if (items.length > 0) setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [fieldType, context]
  );

  function handleChange(newVal: string) {
    onChange(newVal);
    setSelectedIndex(-1);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggestions(newVal), 600);
  }

  function selectSuggestion(s: string) {
    onChange(s);
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const inputClasses = `${className} pr-8`;

  return (
    <div ref={containerRef} className="relative">
      {as === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className={inputClasses}
          required={required}
          rows={rows}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className={inputClasses}
          required={required}
        />
      )}
      {loading && (
        <Sparkles className="absolute right-2.5 top-2.5 h-4 w-4 text-blue-400 animate-pulse" />
      )}
      {!loading && value.length >= 2 && (
        <Sparkles className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-300" />
      )}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-medium text-blue-500 uppercase tracking-wide border-b border-slate-100 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> AI Suggestions
          </div>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${
                i === selectedIndex ? "bg-blue-50 text-blue-700" : "text-slate-700"
              }`}
              onClick={() => selectSuggestion(s)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
