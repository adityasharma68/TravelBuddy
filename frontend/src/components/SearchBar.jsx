// src/components/SearchBar.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  SearchBar — Debounced search input
//
//  Debouncing: waits 350ms after the user stops typing before calling onChange.
//  This prevents a new API request on every keystroke.
//
//  Props:
//    value      {string}   — controlled value
//    onChange   {function} — called with the new value (debounced)
//    placeholder{string}
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";

export default function SearchBar({ value, onChange, placeholder = "Search…" }) {
  // Local state tracks what the user types
  const [local, setLocal] = useState(value || "");

  // Sync if parent resets value externally
  useEffect(() => { setLocal(value || ""); }, [value]);

  // Debounce: fire onChange only after 350ms of no typing
  useEffect(() => {
    const timer = setTimeout(() => onChange(local), 350);
    return () => clearTimeout(timer); // Cancel previous timer on each keystroke
  }, [local]);

  return (
    <div className="relative">
      {/* Search icon */}
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
        ⌕
      </span>
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="form-input pl-8 pr-4 py-1.5 rounded-full w-48 text-sm"
      />
    </div>
  );
}
