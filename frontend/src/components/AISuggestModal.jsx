// src/components/AISuggestModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  AISuggestModal — AI Travel Assistant (Groq-powered)
//
//  Two sections in one component:
//    1. Chat tab  — Multi-turn conversation (4 specialist modes)
//    2. Plan tab  — One-shot travel plan + cost generator
//
//  Props:
//    showToast {function}
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";
import { sendAIChat, generateAIPlan } from "../services/aiService";
import LocationSearch from "./LocationSearch"; // ← Feature 2
import TravelModes    from "./TravelModes";   // ← Smart travel mode suggestions

// ── AI Chat Modes ─────────────────────────────────────────────────────────────
const AI_MODES = [
  { id: "companion", icon: "👥", label: "Companion Matcher", hint: "Find your ideal travel buddy" },
  { id: "planner",   icon: "🗺️", label: "Trip Planner",      hint: "Day-by-day itineraries" },
  { id: "cost",      icon: "💰", label: "Cost Estimator",    hint: "Budget breakdowns in ₹" },
  { id: "places",    icon: "🏨", label: "Stay & Eat Guide",  hint: "Hotels & restaurants" },
];

// ── Plan Types ────────────────────────────────────────────────────────────────
const PLAN_TYPES = [
  { id: "luxury",   icon: "💎", name: "Luxury Plan",   desc: "5-star hotels, premium experience",    price: "₹1,50,000+" },
  { id: "moderate", icon: "⚖️", name: "Moderate Plan", desc: "3-4 star, balanced cost & comfort",   price: "₹50k–₹1L" },
  { id: "budget",   icon: "💰", name: "Budget Plan",   desc: "Hostels, local food, budget flights",  price: "₹20k–₹50k" },
];

// ── Typing dots animation ─────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex gap-1 items-center px-4 py-3">
      {[0,1,2].map(i => (
        <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce-dot"
          style={{ animationDelay: `${i * 0.22}s` }} />
      ))}
    </div>
  );
}

// ── Chat Message Bubble ───────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2.5 mb-4 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div className={`avatar w-7 h-7 text-[10px] shrink-0 ${isUser ? "bg-pink-400" : "bg-forest-700"}`}>
        {isUser ? "ME" : "AI"}
      </div>
      {/* Bubble */}
      <div className={`max-w-[78%] px-4 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-line
        ${isUser
          ? "bg-forest-700 text-white rounded-br-sm"
          : "bg-cream text-gray-800 border border-gray-100 rounded-bl-sm"}`}>
        {msg.content}
      </div>
    </div>
  );
}

// ── AI Chat Panel ─────────────────────────────────────────────────────────────
function ChatPanel({ showToast }) {
  const [mode, setMode]     = useState("companion");
  // Store separate conversation history per mode
  const [history, setHist]  = useState({ companion:[], planner:[], cost:[], places:[] });
  const [input, setInput]   = useState("");
  const [loading, setLoad]  = useState(false);
  const bottomRef           = useRef(null);
  const currentMode         = AI_MODES.find(m => m.id === mode);
  const messages            = history[mode] || [];

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg  = { role: "user", content: input.trim() };
    const newHist  = [...messages, userMsg];

    // Update history immediately (optimistic)
    setHist(h => ({ ...h, [mode]: newHist }));
    setInput("");
    setLoad(true);

    try {
      const { data } = await sendAIChat({ mode, messages: newHist });
      setHist(h => ({ ...h, [mode]: [...newHist, { role: "ai", content: data.text }] }));
    } catch (err) {
      showToast(err.response?.data?.error || "AI unavailable. Check your Groq API key.", "e");
      // Remove the user message on error so they can retry
      setHist(h => ({ ...h, [mode]: messages }));
    } finally {
      setLoad(false);
    }
  };

  return (
    <div className="flex gap-4">
      {/* Mode Sidebar */}
      <div className="w-52 shrink-0">
        <div className="card p-3">
          <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 px-1">Mode</div>
          {AI_MODES.map(m => (
            <button key={m.id}
              className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 border-none cursor-pointer
                         text-sm font-semibold transition-all duration-150 flex items-center gap-2.5
                         ${mode === m.id
                           ? "bg-forest-700 text-white"
                           : "bg-transparent text-gray-500 hover:bg-cream hover:text-forest-700"}`}
              onClick={() => setMode(m.id)}>
              <span className="text-base">{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
          <div className="mt-3 p-3 bg-cream rounded-xl text-xs text-gray-400 leading-relaxed">
            <span className="font-bold text-forest-700">Tip:</span> Each mode has a different AI focus. Switch freely!
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 card overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 bg-cream">
          <div className="font-serif text-base font-semibold text-forest-700">
            {currentMode.icon} {currentMode.label}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{currentMode.hint}</div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 min-h-[300px] max-h-[380px]">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">{currentMode.icon}</div>
              <div className="font-serif text-lg text-forest-700 mb-1">
                Hi! I'm your {currentMode.label.split(" ")[0].toLowerCase()} assistant.
              </div>
              <div className="text-sm">Tell me about your travel plans to get started.</div>
            </div>
          ) : (
            messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)
          )}
          {loading && (
            <div className="flex gap-2.5 mb-4">
              <div className="avatar w-7 h-7 text-[10px] shrink-0 bg-forest-700">AI</div>
              <div className="bg-cream border border-gray-100 rounded-xl rounded-bl-sm">
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Row */}
        <div className="px-4 py-3.5 border-t border-gray-100 flex gap-2.5">
          <input
            className="form-input flex-1 rounded-full py-2"
            placeholder={`Ask about ${currentMode.label.toLowerCase()}…`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          />
          <button
            className="btn-primary px-5 rounded-full py-2"
            onClick={sendMessage}
            disabled={loading || !input.trim()}>
            Send ↑
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Plan Generator Panel ──────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
//  TravelModesInPlanner — Geocodes city names → coords, then renders <TravelModes>
//
//  The AI Plan Builder works with plain text city names (not lat/lng).
//  This wrapper geocodes those names via Nominatim so TravelModes can
//  compute distance and fetch nearby hubs.
//
//  Props:
//    from        {string}  — origin city name (e.g. "Mumbai")
//    destination {string}  — destination city name (e.g. "Bali")
// ─────────────────────────────────────────────────────────────────────────────
function TravelModesInPlanner({ from, destination }) {
  const [fromCoords, setFromCoords] = useState(null); // { lat, lng }
  const [toCoords,   setToCoords]   = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);

  // Geocode a city name → { lat, lng } using Nominatim
  const geocode = async (cityName) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(cityName)}&format=json&limit=1&addressdetails=0`;
      const res  = await fetch(url, { headers: { "Accept-Language": "en" } });
      const data = await res.json();
      if (!data.length) return null;
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch { return null; }
  };

  // Re-geocode whenever city names change
  useEffect(() => {
    if (!from || !destination) return;
    setGeoLoading(true);
    Promise.all([geocode(from), geocode(destination)])
      .then(([f, t]) => { setFromCoords(f); setToCoords(t); })
      .finally(() => setGeoLoading(false));
  }, [from, destination]);

  if (geoLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4
                      bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
        <div className="w-3 h-3 border-2 border-gray-200 border-t-forest-700
                        rounded-full animate-spin shrink-0"/>
        Calculating travel modes for {from} → {destination}…
      </div>
    );
  }

  if (!fromCoords || !toCoords) return null;

  return (
    <div className="mb-5">
      <TravelModes
        fromName={from}     fromLat={fromCoords.lat} fromLng={fromCoords.lng}
        toName={destination} toLat={toCoords.lat}    toLng={toCoords.lng}
        compact={false}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  LocationInputField — reusable field combining:
//    • Free-text input (type anything)
//    • Nominatim autocomplete via <LocationSearch>
//    • Quick-select preset pills below
//
//  Three input modes work together:
//    1. Autocomplete: type → dropdown → click to select (sets both display + value)
//    2. Manual type:  type directly, press Enter or click away — value = what you typed
//    3. Preset pills: click a preset city pill → instantly fills the field
//
//  Props:
//    label        {string}   — "From" / "To"
//    placeholder  {string}
//    value        {string}   — controlled string value (city name)
//    onChange     {fn}       — called with new city name string
//    presets      {string[]} — quick-pick city pills
//    icon         {string}   — emoji icon shown on the chip
// ─────────────────────────────────────────────────────────────────────────────
function LocationInputField({ label, placeholder, value, onChange, presets = [], icon = "📍" }) {
  // inputMode: "search" = show LocationSearch autocomplete
  //            "manual" = show plain text input for free typing
  const [inputMode, setInputMode] = useState("search");
  const [manualVal, setManualVal] = useState(value || "");
  const [searchKey, setSearchKey] = useState(0); // force remount LocationSearch on clear

  // Keep manual input synced when parent sets value externally (e.g. preset click)
  useEffect(() => {
    setManualVal(value || "");
  }, [value]);

  // Commit manual-typed value on blur or Enter
  const commitManual = () => {
    const trimmed = manualVal.trim();
    if (trimmed) onChange(trimmed);
  };

  return (
    <div className="space-y-2">
      {/* ── Mode toggle header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <label className="form-label mb-0">{label}</label>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {[["search","🔍 Search"],["manual","✏️ Type"]].map(([m,l]) => (
            <button
              key={m}
              type="button"
              onClick={() => setInputMode(m)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all duration-150
                          border-none cursor-pointer
                ${inputMode === m
                  ? "bg-forest-700 text-white shadow-sm"
                  : "bg-transparent text-gray-400 hover:text-forest-700"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Input area: Search autocomplete OR manual text ─────────── */}
      {inputMode === "search" ? (
        // ── Autocomplete mode (Nominatim) ────────────────────────────
        // LocationSearch component handles debounce + API call
        <div key={searchKey}>
          <LocationSearch
            label=""
            placeholder={placeholder}
            defaultValue={value}
            onSelect={(loc) => {
              if (loc) {
                const cityName = loc.city || loc.name;
                onChange(cityName);
              }
            }}
          />
          <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
            <span>💡</span>
            Start typing to search any city worldwide — powered by OpenStreetMap
          </p>
        </div>
      ) : (
        // ── Manual type mode ─────────────────────────────────────────
        // Plain input — user types freely, no API needed
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none">
            {icon}
          </span>
          <input
            type="text"
            className="form-input pl-9 pr-9"
            placeholder={`Type any city, e.g. ${placeholder}`}
            value={manualVal}
            onChange={(e) => {
              setManualVal(e.target.value);
              onChange(e.target.value); // live update as user types
            }}
            onBlur={commitManual}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitManual(); }
            }}
          />
          {/* Clear button */}
          {manualVal && (
            <button
              type="button"
              onClick={() => { setManualVal(""); onChange(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                         hover:text-gray-600 bg-transparent border-none cursor-pointer
                         text-base leading-none">
              ×
            </button>
          )}
          <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
            <span>⌨️</span>
            Type any city name directly — no suggestions needed
          </p>
        </div>
      )}

      {/* ── Selected value chip ────────────────────────────────────── */}
      {value && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-forest-700 bg-forest-50
                           px-3 py-1 rounded-full border border-forest-100
                           flex items-center gap-1.5">
            {icon} {value}
            <button
              type="button"
              onClick={() => {
                onChange("");
                setManualVal("");
                setSearchKey(k => k + 1); // remount LocationSearch to clear its input
              }}
              className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors
                         bg-transparent border-none cursor-pointer text-xs leading-none font-black">
              ✕
            </button>
          </span>
          <span className="text-[10px] text-green-600 font-semibold flex items-center gap-1">
            ✓ Set
          </span>
        </div>
      )}

      {/* ── Quick preset pills ─────────────────────────────────────── */}
      {presets.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1.5">
            Quick select:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {presets.map(city => (
              <button
                key={city}
                type="button"
                onClick={() => {
                  onChange(city);
                  setManualVal(city);
                  setSearchKey(k => k + 1); // sync LocationSearch display
                }}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all duration-150
                            cursor-pointer font-medium
                  ${value === city
                    ? "bg-forest-700 text-white border-forest-700 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-forest-600 hover:text-forest-700"}`}>
                {city}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  PlanPanel — AI Travel Plan Builder with full manual location control
//
//  Location input strategy (Feature 4):
//    • Origin (From) — was a locked <select> of 10 Indian cities
//                      → now LocationInputField: autocomplete + manual type + presets
//    • Destination   — had only autocomplete
//                      → now LocationInputField: same full flexibility
//    • Both fields support: Nominatim autocomplete | free typing | preset pills | clear
// ─────────────────────────────────────────────────────────────────────────────
function PlanPanel({ showToast }) {
  const [selectedPlan, setSelectedPlan] = useState("moderate");
  // Store as plain city name strings — either from autocomplete, manual type, or preset
  const [from, setFrom]       = useState("Mumbai");
  const [destination, setDest] = useState("");
  const [days, setDays]       = useState("7");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState("");

  // Preset city options for quick-select pills
  // Origin: Indian departure cities (most common use case)
  const FROM_PRESETS = ["Mumbai","Delhi","Bangalore","Hyderabad","Chennai","Kolkata","Pune","Jaipur","Goa","Ahmedabad"];
  // Destination: popular international travel destinations
  const TO_PRESETS   = ["Bali","Bangkok","Tokyo","Dubai","Paris","Singapore","Maldives","London","Phuket","Kyoto"];

  const generate = async () => {
    // Validate both fields before calling AI
    if (!from.trim()) {
      showToast("Please enter your origin city.", "e");
      return;
    }
    if (!destination.trim()) {
      showToast("Please enter a destination city.", "e");
      return;
    }

    setLoading(true);
    setResult("");
    try {
      const { data } = await generateAIPlan({
        from:       from.trim(),
        destination: destination.trim(),
        days,
        plan_type:  selectedPlan,
      });
      setResult(data.text);
    } catch (err) {
      showToast(err.response?.data?.error || "Plan generation failed. Check your Groq API key.", "e");
    } finally {
      setLoading(false);
    }
  };

  // Reset all fields
  const handleReset = () => {
    setFrom("Mumbai");
    setDest("");
    setDays("7");
    setResult("");
    setSelectedPlan("moderate");
  };

  const plan = PLAN_TYPES.find(p => p.id === selectedPlan);

  return (
    <div>
      {/* ── Plan Type Selector ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {PLAN_TYPES.map(p => (
          <div
            key={p.id}
            onClick={() => setSelectedPlan(p.id)}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                        text-center select-none group
              ${selectedPlan === p.id
                ? "border-forest-700 bg-forest-50 shadow-md"
                : "border-gray-200 bg-white hover:border-forest-400 hover:shadow-sm"}`}>
            <div className={`text-3xl mb-2 transition-transform duration-200
                            ${selectedPlan === p.id ? "scale-110" : "group-hover:scale-105"}`}>
              {p.icon}
            </div>
            <div className="font-serif text-sm font-bold text-forest-700">{p.name}</div>
            <div className="text-xs text-gray-400 mt-1 leading-snug">{p.desc}</div>
            <div className={`text-xs font-black mt-2
              ${selectedPlan === p.id ? "text-forest-700" : "text-amber-600"}`}>
              {p.price}
            </div>
            {selectedPlan === p.id && (
              <div className="mt-2 text-[10px] font-black text-forest-700 uppercase tracking-wider">
                ✓ Selected
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Location + Config Form ──────────────────────────────────── */}
      <div className="card p-5 sm:p-6 mb-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">{plan.icon}</span>
            <span className="font-serif text-base font-semibold text-forest-700">
              Configure Your {plan.name}
            </span>
          </div>
          {/* Reset button */}
          {(from !== "Mumbai" || destination || result) && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors
                         bg-transparent border-none cursor-pointer flex items-center gap-1">
              ↺ Reset
            </button>
          )}
        </div>

        {/* ── From / To location inputs ─────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">

          {/* FROM — origin city */}
          <div className="bg-gray-50/60 rounded-2xl p-4 border border-gray-100">
            <LocationInputField
              label="🛫 From (Origin)"
              placeholder="Mumbai, Delhi, Bangalore…"
              value={from}
              onChange={setFrom}
              presets={FROM_PRESETS}
              icon="🛫"
            />
          </div>

          {/* TO — destination city */}
          <div className="bg-gray-50/60 rounded-2xl p-4 border border-gray-100">
            <LocationInputField
              label="🛬 To (Destination)"
              placeholder="Bali, Tokyo, Paris…"
              value={destination}
              onChange={setDest}
              presets={TO_PRESETS}
              icon="🛬"
            />
          </div>
        </div>

        {/* Route preview strip (shows only when both fields are set) */}
        {from && destination && (
          <div className="flex items-center gap-2 mb-5 px-4 py-2.5 rounded-xl
                          bg-forest-50 border border-forest-100">
            <span className="text-xs font-bold text-forest-700">Route:</span>
            <span className="text-xs font-semibold text-forest-600">{from}</span>
            <span className="text-gray-400 text-xs flex-1 text-center" style={{ letterSpacing:"0.1em" }}>
              ──── ✈️ ────
            </span>
            <span className="text-xs font-semibold text-forest-600">{destination}</span>
            <span className="text-[10px] text-green-600 font-bold ml-auto">✓ Ready</span>
          </div>
        )}

        {/*
          ── Travel Mode Suggestions ───────────────────────────────────
          Shows the ✈️ Flight | 🚆 Train | 🚗 Road cards as soon as
          the user has set both origin and destination.
          Uses the same <TravelModes> shared component as the Map tab.
          compact=true uses a condensed 3-column card layout.

          To get lat/lng for the AI planner, we geocode the city names
          via the PRESET_CITIES lookup, falling back to a fixed coord
          if the city name isn't in the preset list.
        */}
        {from && destination && <TravelModesInPlanner from={from} destination={destination} />}

        {/* ── Duration + Generate ───────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">⏱ Duration</label>
            <div className="flex flex-wrap gap-2">
              {["3","5","7","10","14","21","30"].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`text-xs px-3 py-1.5 rounded-xl border font-bold
                              transition-all duration-150 cursor-pointer
                    ${days === d
                      ? "bg-forest-700 text-white border-forest-700 shadow-sm"
                      : "bg-white text-gray-500 border-gray-200 hover:border-forest-500 hover:text-forest-700"}`}>
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-end gap-2">
            {/* Validation hints */}
            {(!from || !destination) && (
              <div className="text-xs text-amber-600 bg-amber-50 border border-amber-100
                              rounded-xl px-3 py-2 flex items-center gap-1.5">
                <span>⚠️</span>
                <span>
                  {!from && !destination ? "Set both origin and destination"
                    : !from ? "Set your origin city"
                    : "Set your destination city"}
                </span>
              </div>
            )}
            <button
              type="button"
              className="btn-primary py-3 rounded-xl font-bold text-sm
                         flex items-center justify-center gap-2
                         disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={generate}
              disabled={loading || !from.trim() || !destination.trim()}>
              {loading
                ? <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.3)" strokeWidth="3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Generating…
                  </>
                : <>✨ Generate {plan.name}</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── Loading skeleton ────────────────────────────────────────── */}
      {loading && (
        <div className="card p-6 mt-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl animate-bounce">✈️</span>
            <div>
              <div className="font-serif text-base text-forest-700 font-semibold">
                Crafting your {plan.name.toLowerCase()}…
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {from} → {destination} · {days} days · AI is thinking
              </div>
            </div>
          </div>
          {/* Skeleton lines */}
          {[100,75,88,60,80].map((w, i) => (
            <div key={i}
              className="h-3 rounded-full bg-gray-100 mb-2.5 animate-pulse"
              style={{ width:`${w}%`, animationDelay:`${i*0.1}s` }} />
          ))}
        </div>
      )}

      {/* ── Generated plan result ────────────────────────────────────── */}
      {result && !loading && (
        <div className="card mt-4 overflow-hidden">
          {/* Result header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
            style={{ background:"linear-gradient(135deg, #f0f7f3 0%, #fef3e8 100%)" }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{plan.icon}</span>
              <div>
                <div className="font-serif text-base font-bold text-forest-700">
                  {plan.name} — {from} → {destination}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {days} days · Generated by AI
                </div>
              </div>
            </div>
            {/* Edit locations — regenerate with different city */}
            <button
              type="button"
              onClick={() => setResult("")}
              className="text-xs font-bold text-forest-700 hover:text-forest-600
                         bg-white border border-forest-200 px-3 py-1.5 rounded-xl
                         transition-all hover:shadow-sm cursor-pointer">
              ✏️ Edit & Regenerate
            </button>
          </div>
          {/* Result body */}
          <div className="p-6 whitespace-pre-line text-sm leading-relaxed text-gray-700">
            {result}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function AISuggestModal({ showToast }) {
  const [tab, setTab] = useState("chat"); // "chat" | "plan"

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">AI <em>Travel Assistant</em></h1>
          <p className="page-sub">Powered by Groq (Llama 3.3 70B) — intelligent travel planning</p>
        </div>
        {/* Tab Switch */}
        <div className="flex gap-1 bg-cream rounded-xl p-1">
          {[["chat","💬 Chat"],["plan","📋 Plan Builder"]].map(([k,l]) => (
            <button key={k}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 border-none cursor-pointer
                ${tab===k ? "bg-forest-700 text-white" : "bg-transparent text-gray-400"}`}
              onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {tab === "chat" ? <ChatPanel showToast={showToast} /> : <PlanPanel showToast={showToast} />}
    </div>
  );
}
