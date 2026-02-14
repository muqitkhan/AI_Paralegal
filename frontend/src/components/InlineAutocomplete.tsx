"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Sparkles } from "lucide-react";
import VoiceButton from "./VoiceButton";

interface InlineAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  fieldType?: string;
  context?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  as?: "input" | "textarea";
  rows?: number;
  onFocusCapture?: () => void;
}

export default function InlineAutocomplete({
  value,
  onChange,
  fieldType = "general",
  context = "",
  placeholder = "",
  className = "",
  required = false,
  as = "input",
  rows = 3,
  onFocusCapture,
}: InlineAutocompleteProps) {
  const [ghostText, setGhostText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);

  const fetchCompletion = useCallback(
    async (text: string) => {
      if (text.length < 2) {
        setGhostText("");
        return;
      }
      // Cancel any in-flight request
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      try {
        const res = await api.aiComplete(text, fieldType, context);
        const completion = res.completion || "";
        // Only set if user hasn't typed further
        setGhostText(completion);
      } catch {
        setGhostText("");
      } finally {
        setLoading(false);
      }
    },
    [fieldType, context]
  );

  function handleChange(newVal: string) {
    onChange(newVal);
    setGhostText(""); // Clear ghost on new typing
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchCompletion(newVal), 800);
  }

  function acceptCompletion() {
    if (ghostText) {
      onChange(value + ghostText);
      setGhostText("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (ghostText) {
      if (e.key === "Tab" || (e.key === "Enter" && as === "input")) {
        e.preventDefault();
        acceptCompletion();
      } else if (e.key === "ArrowRight") {
        // Only accept if cursor is at end
        const el = inputRef.current;
        if (el && el.selectionStart === value.length) {
          e.preventDefault();
          acceptCompletion();
        }
      } else if (e.key === "Escape") {
        setGhostText("");
      }
    }
  }

  function handleFocus() {
    setIsFocused(true);
    onFocusCapture?.();
    // Re-fetch if we have text but no ghost
    if (value.length >= 2 && !ghostText && !loading) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fetchCompletion(value), 400);
    }
  }

  function handleBlur() {
    setIsFocused(false);
    // Brief delay so click on ghost text can be processed
    setTimeout(() => {
      if (!isFocused) setGhostText("");
    }, 200);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const showGhost = isFocused && ghostText && value.length > 0;

  const baseClasses = className;

  if (as === "textarea") {
    return (
      <div className="relative">
        {/* Ghost layer behind textarea */}
        {showGhost && (
          <div
            ref={mirrorRef}
            className={`${baseClasses} absolute inset-0 pointer-events-none whitespace-pre-wrap overflow-hidden`}
            style={{ color: "transparent", background: "transparent" }}
            aria-hidden="true"
          >
            <span>{value}</span>
            <span
              className="text-slate-400 cursor-pointer"
              onClick={acceptCompletion}
              style={{ pointerEvents: "auto" }}
            >
              {ghostText}
            </span>
          </div>
        )}
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`${baseClasses} relative ${showGhost ? "bg-transparent" : ""}`}
          style={showGhost ? { caretColor: "#1e293b" } : undefined}
          required={required}
          rows={rows}
        />
        {/* Voice + Hint badges */}
        <div className="absolute bottom-1 right-1 flex items-center gap-1 z-10">
          <VoiceButton
            onTranscript={(text) => {
              const newVal = value ? value + " " + text : text;
              onChange(newVal);
            }}
          />
          {showGhost && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded text-[10px] text-blue-600 font-medium pointer-events-none">
              <Sparkles className="h-2.5 w-2.5" /> Tab to accept
            </div>
          )}
        </div>
        {loading && (
          <Sparkles className="absolute right-2.5 top-2.5 h-4 w-4 text-blue-400 animate-pulse" />
        )}
      </div>
    );
  }

  // Input mode
  return (
    <div className="relative">
      {/* Ghost layer behind input */}
      {showGhost && (
        <div
          className={`${baseClasses} absolute inset-0 pointer-events-none overflow-hidden flex items-center`}
          style={{ color: "transparent", background: "transparent" }}
          aria-hidden="true"
        >
          <span className="whitespace-pre">{value}</span>
          <span
            className="text-slate-400 whitespace-pre cursor-pointer"
            onClick={acceptCompletion}
            style={{ pointerEvents: "auto" }}
          >
            {ghostText}
          </span>
        </div>
      )}
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`${baseClasses} relative ${showGhost ? "bg-transparent" : ""}`}
        style={showGhost ? { caretColor: "#1e293b" } : undefined}
        required={required}
      />
      {/* Right-side controls */}
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 z-10">
        {showGhost && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded text-[10px] text-blue-600 font-medium pointer-events-none">
            <Sparkles className="h-2.5 w-2.5" /> Tab
          </div>
        )}
        {loading && !showGhost && (
          <Sparkles className="h-4 w-4 text-blue-400 animate-pulse" />
        )}
      </div>
    </div>
  );
}
