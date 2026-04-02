// src/components/StatsBar.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  StatsBar — Dashboard statistics cards row
//
//  Props:
//    stats {Object} — { totalUsers, activeUsers, suspended, totalTrips, totalRequests }
// ─────────────────────────────────────────────────────────────────────────────

export default function StatsBar({ stats = {} }) {
  const cards = [
    { label: "Total Users",    value: stats.totalUsers,    sub: "registered" },
    { label: "Active",         value: stats.activeUsers,   sub: "accounts" },
    { label: "Suspended",      value: stats.suspended,     sub: "accounts" },
    { label: "Total Trips",    value: stats.totalTrips,    sub: "posted" },
    { label: "Join Requests",  value: stats.totalRequests, sub: "platform total" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-8">
      {cards.map(({ label, value, sub }) => (
        <div key={label} className="stat-card">
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value ?? "—"}</div>
          <div className="stat-sub">{sub}</div>
        </div>
      ))}
    </div>
  );
}
