// src/components/MapView.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  MapView — Interactive route map with Smart Travel Mode Suggestions
//
//  The travel mode cards (✈️ 🚆 🚗) are now rendered by the shared
//  <TravelModes> component so the same UI appears in both the Map tab
//  and the AI Plan Builder tab.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import LocationSearch from "./LocationSearch";
import TravelModes    from "./TravelModes";   // ← shared component

// ── Preset cities for quick-select pills ─────────────────────────────────────
const PRESET_CITIES = {
  "Mumbai":    [19.076,  72.877], "Delhi":     [28.704,  77.102],
  "Bangalore": [12.972,  77.594], "Goa":       [15.299,  74.124],
  "Hyderabad": [17.385,  78.486], "Chennai":   [13.083,  80.273],
  "Kolkata":   [22.573,  88.364], "Jaipur":    [26.912,  75.787],
  "Kyoto":     [35.011, 135.768], "Tokyo":     [35.682, 139.691],
  "Bali":      [-8.409, 115.188], "Singapore": [ 1.290, 103.850],
  "Bangkok":   [13.756, 100.502], "Dubai":     [25.204,  55.270],
  "Paris":     [48.857,   2.347], "London":    [51.507,  -0.128],
  "New York":  [40.713, -74.006], "Sydney":    [-33.868, 151.209],
};

// Haversine for the distance stat strip
const haversineKm = (a, b) => {
  if (!a || !b) return 0;
  const R = 6371, r = x => x * Math.PI / 180;
  const dLat = r(b[0]-a[0]), dLon = r(b[1]-a[1]);
  const h = Math.sin(dLat/2)**2 + Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dLon/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h)));
};

export default function MapView() {
  const [fromLoc, setFromLoc] = useState({ name:"Mumbai", lat:19.076, lng:72.877  });
  const [toLoc,   setToLoc]   = useState({ name:"Bali",   lat:-8.409, lng:115.188 });
  const [ready,   setReady]   = useState(false);
  const mapRef  = useRef(null);
  const mapInst = useRef(null);

  // ── Load Leaflet from CDN ───────────────────────────────────────────────────
  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const l = document.createElement("link");
      l.id = "leaflet-css"; l.rel = "stylesheet";
      l.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(l);
    }
    if (window.L) { setReady(true); return; }
    const s = document.createElement("script");
    s.src    = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    s.onload = () => setReady(true);
    document.body.appendChild(s);
  }, []);

  // ── Draw / update map whenever locations change ─────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current || !fromLoc?.lat || !toLoc?.lat) return;

    const L  = window.L;
    const fc = [fromLoc.lat, fromLoc.lng];
    const tc = [toLoc.lat,   toLoc.lng];

    if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; }

    const map = L.map(mapRef.current).setView(
      [(fc[0]+tc[0])/2, (fc[1]+tc[1])/2], 3
    );
    mapInst.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors", maxZoom: 18,
    }).addTo(map);

    // Curved dashed route arc
    const ctrl = [
      (fc[0]+tc[0])/2 + (tc[1]-fc[1]) * 0.12,
      (fc[1]+tc[1])/2 - (tc[0]-fc[0]) * 0.12,
    ];
    L.polyline([fc, ctrl, tc], {
      color: "#1a3d2b", weight: 2.5, dashArray: "8,5", opacity: 0.9,
    }).addTo(map);

    // Coloured dot markers with city labels
    const dot = (color, city) => L.divIcon({
      className: "",
      html: `<div style="width:13px;height:13px;border-radius:50%;background:${color};
                          border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>
             <div style="font-size:10px;font-weight:700;color:${color};margin-top:2px;
                         white-space:nowrap;text-shadow:0 1px 2px rgba(255,255,255,.9)">
               ${city}
             </div>`,
      iconAnchor: [6,6], popupAnchor: [0,-10],
    });

    L.marker(fc, { icon: dot("#1a3d2b", fromLoc.name) })
      .addTo(map).bindPopup(`<b>🛫 From: ${fromLoc.name}</b>`).openPopup();
    L.marker(tc, { icon: dot("#c9640a", toLoc.name) })
      .addTo(map).bindPopup(`<b>🛬 To: ${toLoc.name}</b>`);

    map.fitBounds(L.latLngBounds([fc, tc]), { padding: [55, 55] });

    return () => { if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; } };
  }, [ready, fromLoc, toLoc]);

  // Quick-select preset
  const selectPreset = (type, city) => {
    const [lat, lng] = PRESET_CITIES[city];
    const loc = { name: city, lat, lng };
    if (type === "from") setFromLoc(loc); else setToLoc(loc);
  };

  const fc   = fromLoc ? [fromLoc.lat, fromLoc.lng] : null;
  const tc   = toLoc   ? [toLoc.lat,   toLoc.lng]   : null;
  const dist = haversineKm(fc, tc);

  const CHECKLIST = [
    ["🛂","Visa",       "Check destination entry requirements"],
    ["💉","Health",     "Verify required vaccinations"],
    ["💵","Currency",   "Exchange or load a travel card"],
    ["📱","Local SIM",  "Get a SIM card on arrival"],
    ["🏥","Insurance",  "Purchase travel health insurance"],
    ["📋","Documents",  "Scan passport & carry copies"],
  ];

  return (
    <div>
      <h1 className="page-title">Route <em>Explorer</em></h1>
      <p className="page-sub">
        Pick any two cities — get smart travel mode suggestions with nearest airports &amp; stations
      </p>

      {/* ── Location inputs ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* FROM */}
        <div>
          <LocationSearch
            label="From"
            placeholder="Type origin city…"
            defaultValue={fromLoc?.name}
            onSelect={loc => { if (loc) setFromLoc({ name:loc.city||loc.name, lat:loc.lat, lng:loc.lng }); }}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {["Mumbai","Delhi","Bangalore","Goa","Hyderabad"].map(c => (
              <button key={c} type="button"
                className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-all
                  ${fromLoc?.name === c
                    ? "bg-forest-700 text-white border-forest-700"
                    : "border-gray-200 text-gray-500 bg-white hover:border-forest-600 hover:text-forest-700"}`}
                onClick={() => selectPreset("from", c)}>{c}
              </button>
            ))}
          </div>
        </div>

        {/* TO */}
        <div>
          <LocationSearch
            label="To"
            placeholder="Type destination city…"
            defaultValue={toLoc?.name}
            onSelect={loc => { if (loc) setToLoc({ name:loc.city||loc.name, lat:loc.lat, lng:loc.lng }); }}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {["Tokyo","Bali","Paris","Dubai","Singapore"].map(c => (
              <button key={c} type="button"
                className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-all
                  ${toLoc?.name === c
                    ? "bg-amber-600 text-white border-amber-600"
                    : "border-gray-200 text-gray-500 bg-white hover:border-amber-500 hover:text-amber-600"}`}
                onClick={() => selectPreset("to", c)}>{c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick stats strip ────────────────────────────────────────── */}
      {dist > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {[
            ["📍 Distance", `${dist.toLocaleString()} km`],
            ["🌐 Route",    `${fromLoc.name} → ${toLoc.name}`],
            ["✈️ ~Flight",  `${Math.round(dist/820*10)/10} hrs`],
            ["💺 ~Fare",    `₹${(Math.round(dist*5.5/100)*100).toLocaleString()}`],
          ].map(([l, v]) => (
            <div key={l} className="card px-3.5 py-2 text-xs text-gray-500 flex items-center gap-1.5">
              {l} — <span className="font-bold text-forest-700">{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Map ─────────────────────────────────────────────────────── */}
      {!ready && (
        <div className="flex items-center justify-center bg-white rounded-2xl
                        border border-gray-100 h-[360px] mb-5">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-forest-700
                            rounded-full animate-spin"/>
            Loading map…
          </div>
        </div>
      )}
      <div id="travel-map" ref={mapRef}
        className="mb-5"
        style={{ display: ready ? "block" : "none" }} />

      {/* ── Travel Mode Suggestions ──────────────────────────────────
          The <TravelModes> component handles all three mode cards,
          hub detection, and the summary strip.
          It is the same component used inside the AI Plan Builder.
      ─────────────────────────────────────────────────────────────── */}
      {fromLoc?.lat && toLoc?.lat && (
        <div className="card p-5 sm:p-6 mb-5">
          <TravelModes
            fromName={fromLoc.name}
            fromLat={fromLoc.lat}
            fromLng={fromLoc.lng}
            toName={toLoc.name}
            toLat={toLoc.lat}
            toLng={toLoc.lng}
            compact={false}
          />
        </div>
      )}

      {/* ── Pre-travel checklist ─────────────────────────────────────── */}
      <div className="card p-5 sm:p-6">
        <div className="font-serif text-base font-semibold text-forest-700 mb-4">
          Pre-travel Checklist
          {fromLoc && toLoc && (
            <span className="text-gray-400 font-sans text-sm font-normal ml-2">
              for {fromLoc.name} → {toLoc.name}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CHECKLIST.map(([e,t,d]) => (
            <div key={t} className="text-sm text-gray-500 flex items-start gap-1.5">
              <span className="shrink-0">{e}</span>
              <div><strong className="text-gray-700">{t}:</strong> {d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
