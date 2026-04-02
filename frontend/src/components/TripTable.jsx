// src/components/TripTable.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  TripTable — Renders a list of trip cards (Browse view) or a data table
//              (Admin / My Trips view).
//
//  Two modes:
//    mode="cards"  → responsive grid of styled trip cards (default)
//    mode="table"  → compact tabular view for admin / my trips
//
//  Props:
//    trips       {Array}     — trip objects from API
//    loading     {boolean}
//    mode        {string}    — "cards" | "table"
//    onSelect    {function}  — called when a card/row is clicked (opens detail panel)
//    onDelete    {function}  — called when delete button is clicked (table mode)
//    joined      {Set}       — set of trip IDs the user has already requested
//    isOwner     {boolean}   — true when showing user's own trips (table mode)
// ─────────────────────────────────────────────────────────────────────────────

// ── Plan badge helper ─────────────────────────────────────────────────────────
const planLabel = (p) =>
  p === "luxury" ? "💎 Luxury" : p === "budget" ? "💰 Budget" : "⚖️ Moderate";

// ── Loading Spinner ───────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-[3px] border-gray-100 border-t-forest-700 rounded-full animate-spin" />
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function Empty({ message = "No trips found" }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-4xl mb-3">🌍</div>
      <div className="font-serif text-xl text-forest-700 mb-1">{message}</div>
      <div className="text-sm">Try adjusting your filters or be the first to post!</div>
    </div>
  );
}

// ── Trip Card (grid view) ─────────────────────────────────────────────────────
function TripCard({ trip, onSelect, isJoined }) {
  return (
    <div
      onClick={() => onSelect(trip)}
      className="card overflow-hidden cursor-pointer transition-all duration-200
                 hover:-translate-y-1 hover:shadow-lift hover:border-forest-200">

      {/* Visual header with gradient */}
      <div className="h-44 relative overflow-hidden">
        <div className="w-full h-full" style={{ background: trip.gradient }} />
        {/* Diagonal texture overlay */}
        <div className="absolute inset-0 trip-pattern opacity-[0.055]" />
        {/* Dark bottom vignette for text legibility */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to top,rgba(0,0,0,0.62) 0%,rgba(0,0,0,0.04) 55%,transparent 100%)" }} />

        {/* Plan type badge — top right */}
        <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wide
                         bg-white/20 backdrop-blur-sm text-white border border-white/25">
          {planLabel(trip.plan_type)}
        </span>

        {/* Destination text — bottom left */}
        <div className="absolute bottom-3 left-4 right-4 text-white">
          <div className="text-[11px] font-bold uppercase tracking-widest opacity-70">
            {trip.country}
          </div>
          <div className="font-serif text-2xl font-medium leading-tight">
            {trip.destination}
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4">
        {/* Host row */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="avatar w-7 h-7 text-[11px]"
            style={{ background: trip.host_color }}>{trip.host_av}</div>
          <span className="text-sm font-semibold text-gray-700">{trip.host}</span>
          <span className={`badge badge-${trip.trip_type?.toLowerCase()} ml-auto text-[10px]`}>
            {trip.trip_type}
          </span>
        </div>

        {/* Description preview */}
        <p className="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-2">
          {trip.description}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-2 pt-2.5 border-t border-gray-100 text-xs text-gray-400">
          <span>📅 {trip.dates}</span>
          <span>⏱ {trip.duration}</span>
          <span className="ml-auto font-bold text-amber-600">
            {isJoined ? "✓ Sent" : `${trip.spots} spot${trip.spots !== 1 ? "s" : ""} left`}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function TripTable({ trips, loading, mode = "cards", onSelect, onDelete, joined = new Set(), isOwner = false }) {

  if (loading)           return <Spinner />;
  if (!trips?.length)    return <Empty />;

  // ── Card Grid Mode ─────────────────────────────────────────────────────────
  if (mode === "cards") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {trips.map(trip => (
          <TripCard
            key={trip.id}
            trip={trip}
            onSelect={onSelect}
            isJoined={joined.has(trip.id)}
          />
        ))}
      </div>
    );
  }

  // ── Table Mode (My Trips / Admin) ──────────────────────────────────────────
  return (
    <div className="card overflow-hidden overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Destination</th>
            <th>Dates</th>
            <th>Type</th>
            <th>Plan</th>
            <th>Spots</th>
            <th>Budget</th>
            <th>Requests</th>
            {isOwner && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {trips.map(trip => (
            <tr key={trip.id} className="cursor-pointer" onClick={() => onSelect(trip)}>
              <td>
                <div className="font-semibold text-sm">{trip.destination}</div>
                <div className="text-xs text-gray-400">{trip.country}</div>
              </td>
              <td className="text-xs text-gray-500">{trip.dates}</td>
              <td>
                <span className={`badge badge-${trip.trip_type?.toLowerCase()}`}>
                  {trip.trip_type}
                </span>
              </td>
              <td>
                <span className={`badge badge-${trip.plan_type}`}>
                  {planLabel(trip.plan_type)}
                </span>
              </td>
              <td className="font-semibold">{trip.spots}/{trip.total_spots}</td>
              <td className="font-semibold text-sm">{trip.budget}</td>
              <td className="font-semibold">{trip.req_count}</td>
              {isOwner && (
                <td onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn-danger text-xs px-2.5 py-1.5"
                    onClick={() => onDelete(trip.id)}>
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
