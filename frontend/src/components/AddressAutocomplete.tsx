"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { MapPin } from "lucide-react";
import InlineAutocomplete from "./InlineAutocomplete";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  fieldType?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = "123 Main St, City, State ZIP",
  className = "",
  required = false,
  fieldType = "address",
}: AddressAutocompleteProps) {
  const [addresses, setAddresses] = useState<string[]>([]);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getAddresses().then(setAddresses).catch(() => {});
  }, []);

  useEffect(() => {
    if (!value.trim()) {
      setFiltered(addresses);
    } else {
      const lower = value.toLowerCase();
      setFiltered(
        addresses.filter(
          (a) => a.toLowerCase().includes(lower) && a.toLowerCase() !== lower
        )
      );
    }
    setSelectedIdx(-1);
  }, [value, addresses]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(addr: string) {
    onChange(addr);
    setShowDropdown(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && selectedIdx >= 0) {
      e.preventDefault();
      handleSelect(filtered[selectedIdx]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  const hasAddresses = addresses.length > 0;

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <InlineAutocomplete
        value={value}
        onChange={(v) => {
          onChange(v);
          if (hasAddresses) setShowDropdown(true);
        }}
        fieldType={fieldType}
        placeholder={placeholder}
        className={className}
        required={required}
        onFocusCapture={() => {
          if (hasAddresses && filtered.length > 0) setShowDropdown(true);
        }}
      />
      {/* Past addresses indicator */}
      {hasAddresses && !showDropdown && (
        <button
          type="button"
          onClick={() => setShowDropdown(true)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-500 transition-colors z-10"
          title="Show saved addresses"
        >
          <MapPin className="h-3.5 w-3.5" />
        </button>
      )}
      {/* Dropdown */}
      {showDropdown && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-medium text-slate-400 uppercase tracking-wide border-b border-slate-100">
            Saved Addresses
          </div>
          {filtered.map((addr, i) => (
            <button
              key={addr}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(addr)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center gap-2 ${
                i === selectedIdx ? "bg-blue-50 text-blue-700" : "text-slate-700"
              }`}
            >
              <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
              <span className="truncate">{addr}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
