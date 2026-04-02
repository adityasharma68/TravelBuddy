// src/components/LocationSearch.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  LocationSearch — Free-type + autocomplete location input
//
//  Three ways to set a location (all call onSelect):
//    1. Type → wait for dropdown → click a result
//    2. Type → press Enter → uses the first dropdown result (or geocodes query)
//    3. Type any name → click the "Use this location" fallback button
//
//  Bug fixes in this version:
//    • Enter key now confirms the first autocomplete result
//    • Fallback geocodes the raw typed text when no dropdown result is selected
//    • defaultValue sync no longer blocks re-typing (removed selected flag)
//    • Clicking outside closes dropdown but preserves typed text
//
//  Props:
//    label        {string}   — field label
//    placeholder  {string}   — input placeholder
//    onSelect     {function} — called with { name, lat, lng, displayName }
//    defaultValue {string}   — pre-fill value from parent
//    className    {string}   — extra wrapper classes
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

export default function LocationSearch({
  placeholder  = "Type a city or place…",
  onSelect,
  defaultValue = "",
  label        = "Location",
  className    = "",
}) {
  const [query,      setQuery]      = useState(defaultValue || "");
  const [results,    setResults]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [open,       setOpen]       = useState(false);
  const [confirmed,  setConfirmed]  = useState(!!defaultValue); // is a location confirmed?
  const wrapperRef  = useRef(null);
  const debounceRef = useRef(null);
  const latestQuery = useRef(query);

  // Keep ref in sync so async callbacks use latest value
  useEffect(() => { latestQuery.current = query; }, [query]);

  // ── Sync defaultValue from parent (preset click, AI suggestion, etc.) ──────
  useEffect(() => {
    if (defaultValue && defaultValue !== query) {
      setQuery(defaultValue);
      setConfirmed(true);
      setOpen(false);
      setResults([]);
    }
  }, [defaultValue]); // eslint-disable-line

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Debounced Nominatim search ────────────────────────────────────────────
  useEffect(() => {
    // Skip if confirmed (preset/Enter selection) — wait for user to type again
    if (confirmed) return;

    clearTimeout(debounceRef.current);

    if (!query || query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: query.trim(), format: "json", limit: "6",
          addressdetails: "1", "accept-language": "en",
        });
        const res  = await fetch(`${NOMINATIM}?${params}`, {
          headers: { "Accept-Language": "en" },
        });
        const data = await res.json();

        // Only update if query hasn't changed since fetch started
        if (latestQuery.current !== query) return;

        const formatted = data.map(item => ({
          name:        item.name || item.display_name.split(",")[0],
          displayName: item.display_name,
          lat:         parseFloat(item.lat),
          lng:         parseFloat(item.lon),
          type:        item.type,
          city:        item.address?.city || item.address?.town
                    || item.address?.village || item.name,
          country:     item.address?.country || "",
        }));

        setResults(formatted);
        setOpen(formatted.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 420);

    return () => clearTimeout(debounceRef.current);
  }, [query, confirmed]);

  // ── Confirm a result (click or Enter) ────────────────────────────────────
  const confirmLocation = useCallback((loc) => {
    const displayName = loc.city || loc.name;
    setQuery(displayName);
    setConfirmed(true);
    setOpen(false);
    setResults([]);
    onSelect?.({ ...loc, name: displayName });
  }, [onSelect]);

  // ── Geocode the raw typed text (fallback when no dropdown selected) ────────
  const geocodeTyped = useCallback(async () => {
    const q = query.trim();
    if (!q) return;

    // If dropdown is open and has results, just use the first one
    if (results.length > 0) {
      confirmLocation(results[0]);
      return;
    }

    // Otherwise, geocode what the user typed
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q, format: "json", limit: "1",
        addressdetails: "1", "accept-language": "en",
      });
      const res  = await fetch(`${NOMINATIM}?${params}`, {
        headers: { "Accept-Language": "en" },
      });
      const data = await res.json();

      if (data.length > 0) {
        const item = data[0];
        confirmLocation({
          name:        item.name || item.display_name.split(",")[0],
          displayName: item.display_name,
          lat:         parseFloat(item.lat),
          lng:         parseFloat(item.lon),
          type:        item.type,
          city:        item.address?.city || item.address?.town
                    || item.address?.village || item.name,
          country:     item.address?.country || "",
        });
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [query, results, confirmLocation]);

  // ── Clear ─────────────────────────────────────────────────────────────────
  const handleClear = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
    setConfirmed(false);
    onSelect?.(null);
  };

  // ── Handle user typing — reset confirmed so search resumes ────────────────
  const handleChange = (e) => {
    setQuery(e.target.value);
    setConfirmed(false); // user is typing again → enable autocomplete
  };

  // ── Enter key: confirm first result or geocode typed text ─────────────────
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      geocodeTyped();
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown" && results.length > 0) {
      // Could add keyboard navigation here in future
      setOpen(true);
    }
  };

  const placeIcon = (type) => {
    const icons = {
      city:"🏙️", town:"🏘️", village:"🏡", country:"🌍",
      state:"📍", region:"📍", island:"🏝️", airport:"✈️",
      tourism:"🗺️", mountain:"⛰️", beach:"🏖️",
    };
    return icons[type] || "📍";
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {label && <label className="form-label">{label}</label>}

      <div className="relative">
        {/* Search / spinner icon */}
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400
                         text-sm pointer-events-none select-none">
          {loading ? (
            <span className="inline-block w-3.5 h-3.5 border-2 border-gray-300
                             border-t-forest-700 rounded-full"
              style={{ animation:"spin .6s linear infinite" }} />
          ) : confirmed ? "✅" : "⌕"}
        </span>

        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0 && !confirmed) setOpen(true); }}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck="false"
          className={`form-input pl-9 pr-9 transition-all duration-150
            ${confirmed
              ? "border-forest-700 bg-forest-50"
              : "border-gray-200 bg-cream"}`}
        />

        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                       hover:text-gray-700 cursor-pointer bg-transparent border-none
                       text-lg leading-none transition-colors">
            ×
          </button>
        )}
      </div>

      {/* Hint: press Enter to confirm typed text */}
      {query && !confirmed && !open && query.trim().length >= 2 && !loading && (
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-gray-400">
            Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Enter</kbd>{" "}
            to use "<strong className="text-gray-600">{query}</strong>"
          </span>
          <button
            type="button"
            onClick={geocodeTyped}
            className="text-[10px] font-bold text-forest-700 hover:text-forest-600
                       bg-transparent border-none cursor-pointer transition-colors">
            Use this →
          </button>
        </div>
      )}

      {/* Autocomplete dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1
                        bg-white border border-gray-200 rounded-xl
                        shadow-lift overflow-hidden max-h-60 overflow-y-auto">
          {results.map((loc, idx) => (
            <button
              key={idx}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur before click registers
                confirmLocation(loc);
              }}
              className={`w-full text-left px-4 py-3 transition-colors
                          border-b border-gray-50 last:border-b-0 cursor-pointer
                          bg-transparent hover:bg-cream
                          ${idx === 0 ? "border-t-2 border-t-forest-100" : ""}`}>
              <div className="flex items-start gap-2.5">
                <span className="text-base shrink-0 mt-0.5">{placeIcon(loc.type)}</span>
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-gray-800 truncate">
                    {loc.city || loc.name}
                    {loc.country && (
                      <span className="font-normal text-gray-400 ml-1.5 text-xs">
                        {loc.country}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 truncate mt-0.5">
                    {loc.displayName}
                  </div>
                </div>
                {idx === 0 && (
                  <span className="ml-auto shrink-0 text-[9px] font-bold
                                   text-forest-700 bg-forest-50 px-1.5 py-0.5
                                   rounded-full border border-forest-100">
                    ↵ Enter
                  </span>
                )}
              </div>
            </button>
          ))}
          <div className="px-3 py-1.5 bg-gray-50 text-[10px] text-gray-400 text-right">
            © OpenStreetMap contributors
          </div>
        </div>
      )}

      {/* No results */}
      {open && results.length === 0 && !loading && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1
                        bg-white border border-gray-200 rounded-xl shadow-card
                        px-4 py-3 text-xs text-gray-400 text-center">
          No results for "<strong>{query}</strong>".{" "}
          <button
            type="button"
            onClick={geocodeTyped}
            className="text-forest-700 font-bold hover:underline
                       bg-transparent border-none cursor-pointer">
            Try anyway →
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
