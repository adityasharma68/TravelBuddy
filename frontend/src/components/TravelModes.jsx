// src/components/TravelModes.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  TravelModes — Smart Route & Travel Mode Suggestions
//
//  Feature 5 implementation.
//  Used in: MapView (Map tab) and AISuggestModal (Plan Builder tab)
//
//  Shows ✈️ Flight | 🚆 Train | 🚗 Road cards with:
//    • Duration estimate
//    • Cost range in ₹
//    • Nearest airport / railway station (from local hub database)
//    • Pros, cons, booking tips (expand on click)
//    • AI-recommended best mode badge
//    • Active mode summary strip
//
//  Hub data is stored locally — no external API needed, instant results.
//
//  Props:
//    fromName  {string}  — origin city name
//    fromLat   {number}  — origin latitude
//    fromLng   {number}  — origin longitude
//    toName    {string}  — destination city name
//    toLat     {number}  — destination latitude
//    toLng     {number}  — destination longitude
//    compact   {boolean} — condensed layout for AI planner (default false)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  LOCAL HUB DATABASE
//  Major airports and railway stations for 60+ cities.
//  Keyed by lowercase city name for easy lookup.
//  Fallback: Nominatim-based lookup for unknown cities.
// ─────────────────────────────────────────────────────────────────────────────
const HUBS = {
  // ── India ────────────────────────────────────────────────────────────────
  "mumbai":    { airport:"Chhatrapati Shivaji Maharaj Intl (BOM)", station:"Mumbai CST / Dadar Rly Station" },
  "delhi":     { airport:"Indira Gandhi Intl Airport (DEL)",       station:"New Delhi Railway Station" },
  "bangalore": { airport:"Kempegowda Intl Airport (BLR)",          station:"Krantivira Sangolli Rayanna Rly Stn" },
  "hyderabad": { airport:"Rajiv Gandhi Intl Airport (HYD)",         station:"Hyderabad Deccan / Secunderabad" },
  "chennai":   { airport:"Chennai Intl Airport (MAA)",              station:"Chennai Central Railway Station" },
  "kolkata":   { airport:"Netaji Subhash Chandra Bose Intl (CCU)", station:"Howrah Railway Station" },
  "pune":      { airport:"Pune Airport (PNQ)",                      station:"Pune Junction Railway Station" },
  "jaipur":    { airport:"Jaipur Intl Airport (JAI)",               station:"Jaipur Junction Railway Station" },
  "goa":       { airport:"Goa Intl Airport, Dabolim (GOI)",         station:"Madgaon Railway Station" },
  "ahmedabad": { airport:"Sardar Vallabhbhai Patel Intl (AMD)",     station:"Ahmedabad Junction Railway Station" },
  "lucknow":   { airport:"Chaudhary Charan Singh Intl (LKO)",      station:"Lucknow Charbagh Railway Station" },
  "chandigarh":{ airport:"Shaheed Bhagat Singh Intl (IXC)",        station:"Chandigarh Railway Station" },
  "kochi":     { airport:"Cochin Intl Airport (COK)",               station:"Ernakulam Junction Railway Station" },
  "bhubaneswar":{ airport:"Biju Patnaik Intl Airport (BBI)",       station:"Bhubaneswar Railway Station" },
  "coimbatore":{ airport:"Coimbatore Intl Airport (CJB)",          station:"Coimbatore Junction Railway Station" },
  "visakhapatnam":{ airport:"Visakhapatnam Airport (VTZ)",         station:"Visakhapatnam Railway Station" },
  "surat":     { airport:"Surat Airport (STV)",                     station:"Surat Railway Station" },
  "nagpur":    { airport:"Dr. Babasaheb Ambedkar Intl (NAG)",      station:"Nagpur Railway Station" },
  "indore":    { airport:"Devi Ahilya Bai Holkar Airport (IDR)",    station:"Indore Junction Railway Station" },
  "patna":     { airport:"Jay Prakash Narayan Intl (PAT)",         station:"Patna Junction Railway Station" },

  // ── Southeast Asia ────────────────────────────────────────────────────────
  "bali":      { airport:"Ngurah Rai Intl Airport (DPS)",          station:"No railway station in Bali" },
  "bangkok":   { airport:"Suvarnabhumi Airport (BKK)",             station:"Hua Lamphong Railway Station" },
  "singapore": { airport:"Changi Airport (SIN)",                   station:"Woodlands Train Checkpoint" },
  "kuala lumpur":{ airport:"Kuala Lumpur Intl Airport (KUL)",      station:"KL Sentral Railway Station" },
  "jakarta":   { airport:"Soekarno-Hatta Intl Airport (CGK)",      station:"Gambir Railway Station" },
  "hanoi":     { airport:"Noi Bai Intl Airport (HAN)",             station:"Hanoi Railway Station" },
  "ho chi minh city":{ airport:"Tan Son Nhat Intl Airport (SGN)",  station:"Saigon Railway Station" },
  "phuket":    { airport:"Phuket Intl Airport (HKT)",              station:"No railway (bus/ferry only)" },
  "colombo":   { airport:"Bandaranaike Intl Airport (CMB)",        station:"Fort Railway Station, Colombo" },
  "dhaka":     { airport:"Hazrat Shahjalal Intl Airport (DAC)",    station:"Kamalapur Railway Station" },
  "kathmandu": { airport:"Tribhuvan Intl Airport (KTM)",           station:"No railway in Kathmandu" },

  // ── East Asia ─────────────────────────────────────────────────────────────
  "tokyo":     { airport:"Narita / Haneda Airport (NRT/HND)",     station:"Tokyo Station (Shinkansen)" },
  "kyoto":     { airport:"Kansai Intl Airport (KIX)",             station:"Kyoto Station (Shinkansen)" },
  "osaka":     { airport:"Kansai Intl Airport (KIX)",             station:"Shin-Osaka Station (Shinkansen)" },
  "beijing":   { airport:"Beijing Capital Intl Airport (PEK)",     station:"Beijing South Railway Station" },
  "shanghai":  { airport:"Pudong Intl Airport (PVG)",             station:"Shanghai Hongqiao Railway Station" },
  "hong kong": { airport:"Hong Kong Intl Airport (HKG)",          station:"West Kowloon High Speed Rail Station" },
  "seoul":     { airport:"Incheon Intl Airport (ICN)",            station:"Seoul Station (KTX)" },
  "taipei":    { airport:"Taiwan Taoyuan Intl Airport (TPE)",     station:"Taipei Main Station" },

  // ── Middle East ───────────────────────────────────────────────────────────
  "dubai":     { airport:"Dubai Intl Airport (DXB)",              station:"Dubai Union Metro (no Intl rail)" },
  "abu dhabi": { airport:"Abu Dhabi Intl Airport (AUH)",          station:"No railway station yet" },
  "doha":      { airport:"Hamad Intl Airport (DOH)",              station:"Doha Metro (no Intl rail)" },
  "riyadh":    { airport:"King Khalid Intl Airport (RUH)",        station:"Riyadh Metro (Haramain Rail)" },
  "istanbul":  { airport:"Istanbul Airport (IST)",                station:"Halkalı / Pendik (Marmaray Rail)" },

  // ── Europe ────────────────────────────────────────────────────────────────
  "london":    { airport:"Heathrow Airport (LHR)",                station:"London Euston / St Pancras Station" },
  "paris":     { airport:"Charles de Gaulle Airport (CDG)",       station:"Gare du Nord (Eurostar / TGV)" },
  "amsterdam": { airport:"Amsterdam Airport Schiphol (AMS)",      station:"Amsterdam Centraal Station" },
  "rome":      { airport:"Leonardo da Vinci Airport (FCO)",       station:"Roma Termini Railway Station" },
  "barcelona": { airport:"El Prat Airport (BCN)",                 station:"Barcelona Sants Railway Station" },
  "berlin":    { airport:"Brandenburg Airport (BER)",             station:"Berlin Hauptbahnhof" },
  "frankfurt": { airport:"Frankfurt Airport (FRA)",               station:"Frankfurt Hauptbahnhof" },
  "madrid":    { airport:"Adolfo Suárez Madrid–Barajas (MAD)",    station:"Madrid Atocha (AVE)" },
  "vienna":    { airport:"Vienna Intl Airport (VIE)",             station:"Wien Hauptbahnhof" },
  "zurich":    { airport:"Zurich Airport (ZRH)",                  station:"Zürich Hauptbahnhof" },
  "prague":    { airport:"Václav Havel Airport Prague (PRG)",     station:"Praha Hlavní Nádraží" },
  "athens":    { airport:"Athens Intl Airport (ATH)",             station:"Larissa Railway Station" },

  // ── Americas ──────────────────────────────────────────────────────────────
  "new york":  { airport:"JFK / Newark / LaGuardia Airports",     station:"Penn Station New York" },
  "los angeles":{ airport:"Los Angeles Intl Airport (LAX)",       station:"Union Station Los Angeles" },
  "toronto":   { airport:"Toronto Pearson Intl Airport (YYZ)",    station:"Union Station Toronto" },
  "vancouver": { airport:"Vancouver Intl Airport (YVR)",          station:"Pacific Central Station" },
  "cancun":    { airport:"Cancún Intl Airport (CUN)",             station:"No railway in Cancún" },
  "rio de janeiro":{ airport:"Galeão Intl Airport (GIG)",         station:"Central do Brasil Railway Station" },

  // ── Oceania & Pacific ─────────────────────────────────────────────────────
  "sydney":    { airport:"Kingsford Smith Airport (SYD)",         station:"Central Station Sydney" },
  "melbourne": { airport:"Melbourne Airport (MEL)",               station:"Southern Cross Station Melbourne" },
  "auckland":  { airport:"Auckland Airport (AKL)",                station:"Auckland Strand Station" },
  "maldives":  { airport:"Velana Intl Airport (MLE)",             station:"No railway in Maldives" },

  // ── Africa ────────────────────────────────────────────────────────────────
  "cairo":     { airport:"Cairo Intl Airport (CAI)",              station:"Ramses Railway Station, Cairo" },
  "nairobi":   { airport:"Jomo Kenyatta Intl Airport (NBO)",      station:"Nairobi Railway Station" },
  "marrakech": { airport:"Marrakech Menara Airport (RAK)",        station:"Gare de Marrakech (ONCF)" },
};

// ── Haversine: great-circle km ────────────────────────────────────────────────
export const haversineKm = (a, b) => {
  if (!a || !b || a.length < 2 || b.length < 2) return 0;
  const R = 6371, r = x => x * Math.PI / 180;
  const dLat = r(b[0]-a[0]), dLon = r(b[1]-a[1]);
  const h = Math.sin(dLat/2)**2 + Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dLon/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h)));
};

// ── Hub lookup: local DB first, Nominatim fallback ───────────────────────────
function getHubsForCity(cityName) {
  const key = (cityName || "").toLowerCase().trim();
  // Direct match
  if (HUBS[key]) return HUBS[key];
  // Partial match (e.g. "New Delhi" → "delhi")
  const partialKey = Object.keys(HUBS).find(k => key.includes(k) || k.includes(key));
  if (partialKey) return HUBS[partialKey];
  // Unknown city — return placeholder
  return {
    airport: `Nearest airport to ${cityName}`,
    station: `Nearest railway station to ${cityName}`,
  };
}

// ── Route intelligence ────────────────────────────────────────────────────────
export function computeRouteSuggestions(distKm) {
  const isIntl = distKm > 750;

  return {
    flight: {
      available:        distKm >= 100,
      recommended:      distKm >= 500,
      unavailableReason:"Distance too short — flying is impractical under 100 km",
      durationHrs:      Math.round(Math.max(1, distKm / 820) * 10) / 10,
      costMin: distKm < 500  ? 2500  : distKm < 1500 ? 4000  : distKm < 5000 ? 9000  : 28000,
      costMax: distKm < 500  ? 7000  : distKm < 1500 ? 16000 : distKm < 5000 ? 45000 : 100000,
      pros:  ["Fastest option overall", "Best for international routes", "Multiple airlines to compare"],
      cons:  ["Add 2–3 hrs for airport check-in", "Baggage fees can add up", "Higher carbon footprint"],
      tip:   "Book 3–6 weeks early. Compare on Skyscanner, Google Flights, or MakeMyTrip.",
    },
    train: {
      available:        !isIntl && distKm >= 30,
      recommended:      distKm >= 100 && distKm <= 700,
      unavailableReason: isIntl
        ? "Trains don't cross international borders on this route"
        : "Too short — a cab or bus is more convenient",
      durationHrs:      Math.round((distKm < 300 ? distKm/75 : distKm/115) * 10) / 10,
      costMin: distKm < 200 ? 200  : distKm < 500 ? 500  : distKm < 1000 ? 900  : 1600,
      costMax: distKm < 200 ? 1000 : distKm < 500 ? 2500 : distKm < 1000 ? 5000 : 9000,
      pros:  ["City-centre to city-centre", "Scenic & comfortable", "No baggage restrictions", "Eco-friendly"],
      cons:  ["Domestic routes only", "Slower than flights over 600 km", "Booking can be complex"],
      tip:   "Book on IRCTC.co.in (India). Choose Rajdhani, Shatabdi, or Vande Bharat for speed.",
    },
    road: {
      available:        !isIntl && distKm <= 1400,
      recommended:      distKm <= 350,
      unavailableReason: isIntl
        ? "Road travel across international borders is not practical here"
        : "Over 1,400 km — too far for a comfortable road trip",
      durationHrs:      Math.round(distKm / 60 * 10) / 10,
      costMin: Math.round(distKm * 3 / 100) * 100,
      costMax: Math.round(distKm * 7 / 100) * 100,
      pros:  ["Most flexible — stop anywhere", "Cheapest for groups of 3+", "No check-in hassle", "Great for scenic drives"],
      cons:  ["Tiring beyond 500 km", "Traffic and tolls unpredictable", "Fuel costs add up"],
      tip:   "Use Google Maps or MapMyIndia for real-time traffic, tolls, and petrol pumps.",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  TravelModeCard — one card per transport mode
// ─────────────────────────────────────────────────────────────────────────────
function TravelModeCard({ mode, emoji, title, suggestion, fromHub, toHub, selected, onSelect, compact }) {
  const [expanded, setExpanded] = useState(false);
  const { available, recommended, unavailableReason,
          durationHrs, costMin, costMax, pros, cons, tip } = suggestion;

  const modeColors = {
    flight: { accent:"#1a3d2b", light:"#f0f7f3", border:"#a7f3d0" },
    train:  { accent:"#1d4ed8", light:"#eff6ff", border:"#bfdbfe" },
    road:   { accent:"#c2410c", light:"#fff7ed", border:"#fed7aa" },
  };
  const { accent, light, border } = modeColors[mode];

  // ── Unavailable card ──────────────────────────────────────────────────────
  if (!available) {
    return (
      <div className={`rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50
                       flex flex-col items-center justify-center text-center
                       ${compact ? "p-3 min-h-[130px]" : "p-5 min-h-[160px]"}`}>
        <div className={`${compact ? "text-2xl" : "text-3xl"} grayscale opacity-40 mb-2`}>{emoji}</div>
        <div className={`font-bold text-gray-400 ${compact ? "text-xs" : "text-sm"}`}>{title}</div>
        <div className="text-[10px] text-gray-400 mt-1.5 leading-relaxed max-w-[160px]">
          {unavailableReason}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelect?.(mode)}
      className={`rounded-2xl border-2 cursor-pointer transition-all duration-200 overflow-hidden
                  ${compact ? "p-3" : "p-4 sm:p-5"}
                  ${selected
                    ? "shadow-lg scale-[1.01]"
                    : "hover:shadow-md hover:scale-[1.005] border-gray-200 bg-white"}`}
      style={selected
        ? { borderColor: accent, background: light, boxShadow: `0 4px 20px ${accent}22` }
        : {}}>

      {/* ── Card header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {/* Mode icon button */}
          <div
            className={`${compact ? "w-9 h-9 text-lg" : "w-11 h-11 text-2xl"}
                         rounded-2xl flex items-center justify-center shrink-0
                         transition-all duration-200`}
            style={selected
              ? { background: accent, boxShadow: `0 4px 12px ${accent}40` }
              : { background: "#f3f4f6" }}>
            {emoji}
          </div>
          <div>
            <div className={`font-bold text-gray-800 ${compact ? "text-xs" : "text-sm"}`}>
              {title}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              ⏱ ~{durationHrs < 1
                ? `${Math.round(durationHrs * 60)} min`
                : `${durationHrs} hrs`}
            </div>
          </div>
        </div>

        {/* Best / Alt badge */}
        <span
          className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
          style={recommended
            ? { background:"#dcfce7", color:"#15803d" }
            : { background:"#fef3c7", color:"#92400e" }}>
          {recommended ? "✓ Best" : "Alt."}
        </span>
      </div>

      {/* ── Cost range ──────────────────────────────────────────────── */}
      <div
        className={`flex items-baseline gap-1 mb-3 px-3 py-2 rounded-xl
                    ${compact ? "text-sm" : ""}`}
        style={{ background: selected ? `${accent}12` : "#f9fafb" }}>
        <span className={`font-black ${compact ? "text-base" : "text-lg"}`}
          style={{ color: accent }}>
          ₹{costMin.toLocaleString()}
        </span>
        <span className="text-xs text-gray-400">–</span>
        <span className="text-sm font-bold text-gray-500">₹{costMax.toLocaleString()}</span>
        <span className="text-[10px] text-gray-400 ml-1">/ person</span>
      </div>

      {/* ── Hub info ─────────────────────────────────────────────────── */}
      {mode !== "road" && (
        <div className="space-y-1.5 mb-3">
          {/* Origin hub */}
          {fromHub && (
            <div
              className="flex items-start gap-2 px-2.5 py-2 rounded-xl border"
              style={{ background: `${accent}08`, borderColor: `${accent}25` }}>
              <span className="text-sm shrink-0 mt-0.5">
                {mode === "flight" ? "🛫" : "🚉"}
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-0.5">
                  From
                </div>
                <div
                  className="text-xs font-bold leading-snug truncate"
                  style={{ color: accent }}>
                  {fromHub}
                </div>
              </div>
            </div>
          )}

          {/* Destination hub */}
          {toHub && (
            <div
              className="flex items-start gap-2 px-2.5 py-2 rounded-xl border"
              style={{ background:"rgba(201,100,10,0.05)", borderColor:"rgba(201,100,10,0.2)" }}>
              <span className="text-sm shrink-0 mt-0.5">
                {mode === "flight" ? "🛬" : "🚉"}
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-0.5">
                  To
                </div>
                <div className="text-xs font-bold leading-snug truncate text-amber-700">
                  {toHub}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Road directions note */}
      {mode === "road" && (
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl mb-3
                        bg-orange-50 border border-orange-100">
          <span className="text-base shrink-0">🗺️</span>
          <span className="text-[11px] text-orange-700 font-medium leading-snug">
            Use Google Maps for turn-by-turn navigation & live tolls
          </span>
        </div>
      )}

      {/* ── Expand / collapse: pros, cons, tip ──────────────────────── */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
        className="flex items-center gap-1.5 text-[11px] font-bold transition-colors
                   bg-transparent border-none cursor-pointer p-0"
        style={{ color: selected ? accent : "#6b7280" }}>
        <span style={{
          display:"inline-block", transition:"transform 0.2s",
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)"
        }}>▶</span>
        {expanded ? "Hide details" : "Pros, cons & tips"}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          {/* Pros */}
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-green-600 mb-1.5">
              ✓ Pros
            </div>
            {pros.map(p => (
              <div key={p} className="flex items-start gap-1.5 text-[11px] text-gray-600 mb-1">
                <span className="text-green-500 shrink-0 mt-0.5">•</span>{p}
              </div>
            ))}
          </div>

          {/* Cons */}
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-1.5">
              ✗ Cons
            </div>
            {cons.map(c => (
              <div key={c} className="flex items-start gap-1.5 text-[11px] text-gray-600 mb-1">
                <span className="text-red-400 shrink-0 mt-0.5">•</span>{c}
              </div>
            ))}
          </div>

          {/* Booking tip */}
          <div className="px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
            <div className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1">
              💡 Booking Tip
            </div>
            <div className="text-[11px] text-amber-800 leading-relaxed">{tip}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Export
// ─────────────────────────────────────────────────────────────────────────────
export default function TravelModes({
  fromName, fromLat, fromLng,
  toName,   toLat,   toLng,
  compact = false,
}) {
  const [activeMode, setActiveMode] = useState(null);

  const dist        = haversineKm([fromLat, fromLng], [toLat, toLng]);
  const suggestions = dist > 0 ? computeRouteSuggestions(dist) : null;

  // Hub data straight from local database — instant, no API call
  const fromHubs = getHubsForCity(fromName);
  const toHubs   = getHubsForCity(toName);

  // Auto-select recommended mode
  useEffect(() => {
    if (!suggestions) return;
    const best = dist >= 500 ? "flight" : dist >= 100 ? "train" : "road";
    setActiveMode(best);
  }, [dist]);

  if (!dist || !suggestions) return null;

  const bestLabel =
    dist >= 500 ? { emoji:"✈️", text:"Flight — fastest for this distance" }
  : dist >= 100 ? { emoji:"🚆", text:"Train — best comfort for this range" }
  :               { emoji:"🚗", text:"Road — most flexible for short trips" };

  const activeSug = activeMode ? suggestions[activeMode] : null;

  return (
    <div>
      {/* ── Section header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-serif text-lg font-bold text-forest-700 flex items-center gap-2">
            🗺️ Travel Mode Suggestions
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {fromName} → {toName} · {dist.toLocaleString()} km
          </p>
        </div>

        {/* AI recommendation pill */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-white"
          style={{ background:"linear-gradient(135deg,#1a3d2b,#2a5c40)" }}>
          <span>{bestLabel.emoji}</span>
          <span>{bestLabel.text}</span>
        </div>
      </div>

      {/* ── Three mode cards ─────────────────────────────────────────── */}
      <div className={`grid gap-3 ${compact ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3"}`}>
        <TravelModeCard
          mode="flight" emoji="✈️" title="Flight"
          suggestion={suggestions.flight}
          compact={compact}
          fromHub={fromHubs.airport}
          toHub={toHubs.airport}
          selected={activeMode === "flight"}
          onSelect={setActiveMode}
        />
        <TravelModeCard
          mode="train" emoji="🚆" title="Train"
          suggestion={suggestions.train}
          compact={compact}
          fromHub={fromHubs.station}
          toHub={toHubs.station}
          selected={activeMode === "train"}
          onSelect={setActiveMode}
        />
        <TravelModeCard
          mode="road" emoji="🚗" title="Road / Drive"
          suggestion={suggestions.road}
          compact={compact}
          fromHub={null} toHub={null}
          selected={activeMode === "road"}
          onSelect={setActiveMode}
        />
      </div>

      {/* ── Active mode summary strip ─────────────────────────────────── */}
      {activeMode && activeSug?.available && (
        <div
          className="mt-4 px-4 py-3 rounded-2xl flex flex-wrap items-center gap-x-5 gap-y-2"
          style={{
            background:"linear-gradient(135deg,#f0f7f3 0%,#fef8f0 100%)",
            border:"1.5px solid rgba(26,61,43,0.12)",
          }}>
          {/* Selected mode label */}
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm text-white"
              style={{ background: activeMode==="flight" ? "#1a3d2b" : activeMode==="train" ? "#1d4ed8" : "#c2410c" }}>
              {activeMode==="flight" ? "✈️" : activeMode==="train" ? "🚆" : "🚗"}
            </div>
            <span className="text-sm font-bold text-forest-700">
              {activeMode==="flight" ? "Flight" : activeMode==="train" ? "Train" : "Road"} selected
            </span>
          </div>

          {/* Stats */}
          <span className="text-xs text-gray-500 flex items-center gap-1">
            ⏱ ~{activeSug.durationHrs}hrs travel time
          </span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            💰 ₹{activeSug.costMin.toLocaleString()}–₹{activeSug.costMax.toLocaleString()} / person
          </span>

          {/* Hub-to-hub route */}
          {activeMode === "flight" && (
            <span className="text-xs text-gray-500 flex items-center gap-1 min-w-0">
              🛫 {fromHubs.airport} → 🛬 {toHubs.airport}
            </span>
          )}
          {activeMode === "train" && (
            <span className="text-xs text-gray-500 flex items-center gap-1 min-w-0">
              🚉 {fromHubs.station} → 🚉 {toHubs.station}
            </span>
          )}
          {activeMode === "road" && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              🗺️ Use Google Maps for real-time route
            </span>
          )}
        </div>
      )}
    </div>
  );
}
