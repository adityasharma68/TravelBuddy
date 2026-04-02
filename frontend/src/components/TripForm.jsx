// src/components/TripForm.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  TripForm — Create / Edit trip form
//
//  Feature 2 changes:
//    • Destination and Country fields now have a LocationSearch component
//    • Selecting a location auto-fills both Destination and Country
//    • Users can still type manually — LocationSearch is opt-in
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import LocationSearch from "./LocationSearch"; // ← Feature 2

// ── Plan Option Card ──────────────────────────────────────────────────────────
function PlanOption({ id, icon, name, desc, price, selected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(id)}
      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 text-center
        ${selected
          ? "border-forest-700 bg-forest-50"
          : "border-gray-200 bg-white hover:border-forest-300"}`}>
      <div className="text-2xl mb-1.5">{icon}</div>
      <div className="font-serif text-base font-semibold text-forest-700">{name}</div>
      <div className="text-xs text-gray-400 mt-1 leading-snug">{desc}</div>
      <div className="text-sm font-black mt-2" style={{ color: selected ? "#1a3d2b" : "#c9640a" }}>
        {price}
      </div>
      {selected && <div className="text-xs font-bold text-forest-700 mt-1">✓ Selected</div>}
    </div>
  );
}

export default function TripForm({ form, setField, setPlan, addTag, removeTag, submit, loading, error, reset }) {
  const [tagInput, setTagInput] = useState(""); // Local state for tag input field

  // Handle tag input — press Enter to add
  const handleTagKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (tagInput.trim()) {
        addTag(tagInput.trim());
        setTagInput("");
      }
    }
  };

  return (
    <form onSubmit={submit} className="card p-8 max-w-2xl">
      {/* Error banner */}
      {error && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Row 1: Destination + Country — with location search autocomplete */}
      <div className="mb-5">
        {/*
          LocationSearch queries Nominatim for any city worldwide.
          On selection, it auto-fills both Destination and Country fields.
          Users can still type manually in the text inputs below if they prefer.
        */}
        <LocationSearch
          label="Search Destination (optional — auto-fills fields below)"
          placeholder="Type a city to search and auto-fill…"
          defaultValue={form.destination}
          onSelect={(loc) => {
            if (!loc) return;
            // Auto-fill destination with city name
            setField("destination")({ target: { value: loc.city || loc.name } });
            // Auto-fill country if available
            if (loc.country) {
              setField("country")({ target: { value: loc.country } });
            }
          }}
        />
        <p className="text-xs text-gray-400 mt-1">
          Or type destination and country manually below.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="form-label">Destination *</label>
          <input className="form-input" placeholder="e.g. Kyoto" required
            value={form.destination} onChange={setField("destination")} />
        </div>
        <div>
          <label className="form-label">Country *</label>
          <input className="form-input" placeholder="e.g. Japan" required
            value={form.country} onChange={setField("country")} />
        </div>
      </div>

      {/* Row 2: Dates + Duration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="form-label">Travel Dates *</label>
          <input className="form-input" placeholder="e.g. Apr 10–20" required
            value={form.dates} onChange={setField("dates")} />
        </div>
        <div>
          <label className="form-label">Duration</label>
          <input className="form-input" placeholder="e.g. 10 days"
            value={form.duration} onChange={setField("duration")} />
        </div>
      </div>

      {/* Row 3: Spots + Trip Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="form-label">Companions Needed</label>
          <select className="form-input" value={form.spots} onChange={setField("spots")}>
            {[1,2,3,4,5].map(n => (
              <option key={n} value={n}>{n} companion{n > 1 ? "s" : ""}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Trip Type</label>
          <select className="form-input" value={form.trip_type} onChange={setField("trip_type")}>
            <option value="Adventure">Adventure</option>
            <option value="Cultural">Cultural</option>
            <option value="Leisure">Leisure</option>
          </select>
        </div>
      </div>

      {/* Travel Plan Selector */}
      <div className="mb-5">
        <label className="form-label">Travel Plan</label>
        <div className="grid grid-cols-3 gap-3">
          <PlanOption id="luxury"   icon="💎" name="Luxury"   desc="Premium experience"       price="₹1,50,000+"        selected={form.plan_type==="luxury"}   onSelect={setPlan} />
          <PlanOption id="moderate" icon="⚖️" name="Moderate" desc="Balanced comfort"         price="₹50k–₹1L"          selected={form.plan_type==="moderate"} onSelect={setPlan} />
          <PlanOption id="budget"   icon="💰" name="Budget"   desc="Cost-effective travel"    price="₹20k–₹50k"         selected={form.plan_type==="budget"}   onSelect={setPlan} />
        </div>
      </div>

      {/* Description */}
      <div className="mb-5">
        <label className="form-label">About This Trip</label>
        <textarea className="form-input min-h-[90px]" placeholder="What's the vibe? What are you planning?"
          value={form.description} onChange={setField("description")} />
      </div>

      {/* Row 4: Budget + Tags */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7">
        <div>
          <label className="form-label">Budget (per person)</label>
          <input className="form-input" placeholder="e.g. ₹65,000"
            value={form.budget} onChange={setField("budget")} />
        </div>
        <div>
          <label className="form-label">Tags (press Enter to add)</label>
          {/* Tag input with chips */}
          <div
            className="form-input flex flex-wrap gap-1.5 items-center h-auto min-h-[42px] cursor-text"
            onClick={(e) => e.currentTarget.querySelector("input").focus()}>
            {form.tags.map((tag) => (
              <span key={tag}
                className="flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full
                           bg-forest-50 text-forest-700 border border-forest-100">
                {tag}
                <button type="button" onClick={() => removeTag(tag)}
                  className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-sm leading-none">
                  ×
                </button>
              </span>
            ))}
            <input
              className="border-none bg-transparent outline-none text-sm font-sans text-gray-900 flex-1 min-w-[60px]"
              placeholder="Add tag…"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKey}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <button type="button" className="btn-secondary" onClick={reset}>Reset</button>
        <button type="submit" className="btn-primary px-7 py-2.5 text-base rounded-xl" disabled={loading}>
          {loading ? "Publishing…" : "Publish Trip →"}
        </button>
      </div>
    </form>
  );
}
