// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  App — Root component / auth guard / layout shell
//
//  Rendering logic:
//    • No user    → <AuthPage>
//    • role=admin → <AdminShell>  (Overview / Users / Trips tabs)
//    • role=user  → <UserShell>   (Browse / Post / My Trips / AI / Map tabs)
//
//  Global state managed here:
//    • Toast notifications (auto-dismiss after 3s)
// ─────────────────────────────────────────────────────────────────────────────

import { useState }        from "react";
import { useAuth }         from "./context/AuthContext";
import AuthPage            from "./pages/AuthPage";

// ── Page-level Components ─────────────────────────────────────────────────────
import TripTable      from "./components/TripTable";
import TripForm       from "./components/TripForm";
import AISuggestModal from "./components/AISuggestModal";
import MapView        from "./components/MapView";
import StatsBar       from "./components/StatsBar";
import SearchBar      from "./components/SearchBar";
import Modal          from "./components/Modal";
import EditProfileModal from "./components/EditProfileModal"; // ← Feature 1

// ── Hooks ──────────────────────────────────────────────────────────────────────
import {
  useBrowseTrips,
  useMyTrips,
  useTripForm,
  useJoinTrip,
  useMyRequests,
  useJoinRequests,
} from "./hooks/useTrips";
import { useAdminData } from "./hooks/useAdmin";

// ── Services (direct calls for one-off actions) ────────────────────────────────
import { updateRequestStatus } from "./services/tripService";

// =============================================================================
//  SHARED COMPONENTS
// =============================================================================

// ── Toast notification ────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-5 sm:bottom-7 left-1/2 -translate-x-1/2 z-[500]
      px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl whitespace-nowrap
      flex items-center gap-2 animate-fade-in
      ${toast.type === "e"
        ? "bg-red-700 text-white"
        : "bg-forest-700 text-white"}
    `}>
      <span>{toast.type === "e" ? "⚠" : "✓"}</span>
      {toast.msg}
    </div>
  );
}

// ── Sticky header / nav bar ───────────────────────────────────────────────────
function Header({ user, onLogout, onEditProfile }) {
  const [mobileMenuOpen, setMobileMenu] = useState(false);

  return (
    <>
      <header
        className="bg-forest-700 sticky top-0 z-[100]"
        style={{
          boxShadow: "0 2px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.06)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}>
        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-[68px]">

            {/* ── Logo Section ─────────────────────────────────────────
                Icon PNG + HTML text (never an image for text — always crisp).
                Responsive:
                  xs  → icon only (32px), no text
                  sm  → icon (40px) + brand name
                  md+ → icon (46px) + brand name + tagline
            ───────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 shrink-0">

              {/* ── Hiker icon with subtle glow ring ─────────────────── */}
              <div className="relative shrink-0">
                {/* Soft amber glow behind the icon */}
                <div className="absolute inset-0 rounded-full"
                  style={{ background:"radial-gradient(circle, rgba(249,115,22,0.35) 0%, transparent 70%)",
                           transform:"scale(1.5)", filter:"blur(6px)" }} />
                <img
                  src="/travel-icon.png"
                  alt="Travel Buddy"
                  className="relative h-9 w-9 sm:h-11 sm:w-11 md:h-12 md:w-12
                             object-contain drop-shadow-lg"
                />
              </div>

              {/* ── Brand name + tagline ──────────────────────────────── */}
              <div className="hidden sm:flex flex-col justify-center leading-none gap-0.5">
                {/* Brand name — large, bold, white with amber accent */}
                <div className="flex items-baseline gap-0 whitespace-nowrap">
                  <span
                    className="text-lg md:text-xl font-black text-white leading-none"
                    style={{
                      fontFamily:"'Cormorant Garamond', Georgia, serif",
                      fontWeight: 800,
                      letterSpacing: "-0.02em",
                      textShadow: "0 1px 6px rgba(0,0,0,0.4)",
                    }}>
                    Travel
                  </span>
                  <span
                    className="text-lg md:text-xl font-black leading-none"
                    style={{
                      fontFamily:"'Cormorant Garamond', Georgia, serif",
                      fontWeight: 800,
                      letterSpacing: "-0.02em",
                      color: "#fb923c",
                      textShadow: "0 1px 8px rgba(251,146,60,0.5)",
                    }}>
                    -Buddy
                  </span>
                </div>

                {/* Tagline — solid white at full opacity, clearly readable */}
                <span
                  className="hidden md:block text-[9.5px] font-bold tracking-[0.22em]
                             uppercase whitespace-nowrap"
                  style={{ color:"rgba(255,255,255,0.75)", letterSpacing:"0.2em" }}>
                  Connect · Travel · Explore
                </span>
              </div>
            </div>

            {/* ── Desktop right section ───────────────────────────────── */}
            <div className="hidden sm:flex items-center gap-2.5">
              {/* Admin badge */}
              {user.role === "admin" && (
                <span className="text-[10px] font-black uppercase tracking-widest
                                 px-2.5 py-1 rounded-full bg-amber-500/25 text-amber-300
                                 border border-amber-400/40">
                  Admin
                </span>
              )}

              {/* User profile pill — avatar + name, clicking opens Edit Profile */}
              <button
                onClick={onEditProfile}
                title="Edit your profile"
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full
                           bg-white/12 hover:bg-white/22 border border-white/15
                           hover:border-white/30 transition-all duration-200
                           cursor-pointer group"
                style={{ backdropFilter:"blur(4px)" }}>
                {/* Avatar circle — show photo if uploaded, else initials */}
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name}
                    className="w-7 h-7 rounded-full object-cover shrink-0
                               border-2 border-white/25" />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center
                               text-xs font-black text-white shrink-0 border-2 border-white/25"
                    style={{ background: user.color || "#2a5c40",
                             boxShadow:"0 0 0 2px rgba(255,255,255,0.1)" }}>
                    {user.avatar}
                  </div>
                )}
                {/* Name */}
                <span className="text-sm font-semibold text-white/85
                                 group-hover:text-white transition-colors
                                 hidden md:block max-w-[110px] truncate">
                  {user.name?.split(" ")[0]}
                </span>
                {/* Edit pencil hint */}
                <span className="text-[10px] text-white/35 group-hover:text-white/60
                                 transition-colors hidden lg:block">✏</span>
              </button>

              {/* Log out button — clean outlined pill */}
              <button
                onClick={onLogout}
                className="text-xs font-bold px-4 py-2 rounded-full
                           border border-white/25 bg-transparent
                           text-white/70 hover:bg-white/12 hover:text-white
                           hover:border-white/45 transition-all duration-200 cursor-pointer">
                Log out
              </button>
            </div>

            {/* ── Mobile hamburger ────────────────────────────────────── */}
            <button
              className="sm:hidden flex flex-col gap-1.5 p-2 cursor-pointer bg-transparent border-none"
              onClick={() => setMobileMenu(o => !o)}
              aria-label="Menu">
              <span className={`block h-0.5 w-6 bg-white/80 transition-all ${mobileMenuOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`block h-0.5 w-6 bg-white/80 transition-all ${mobileMenuOpen ? "opacity-0" : ""}`} />
              <span className={`block h-0.5 w-6 bg-white/80 transition-all ${mobileMenuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown menu ────────────────────────────────────── */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-white/10 bg-forest-800 px-4 py-3 space-y-2">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="avatar w-9 h-9 text-sm" style={{ background: user.color || "#2a5c40" }}>
                {user.avatar}
              </div>
              <div>
                <div className="text-sm font-bold text-white">{user.name}</div>
                <div className="text-xs text-white/50">{user.role}</div>
              </div>
            </div>
            <button onClick={() => { onEditProfile(); setMobileMenu(false); }}
              className="w-full text-left text-sm font-semibold text-white/80 hover:text-white
                         py-2 px-3 rounded-lg hover:bg-white/10 transition-all border-none
                         bg-transparent cursor-pointer">
              ✏️ Edit Profile
            </button>
            <button onClick={() => { onLogout(); setMobileMenu(false); }}
              className="w-full text-left text-sm font-semibold text-white/70 hover:text-white
                         py-2 px-3 rounded-lg hover:bg-white/10 transition-all border-none
                         bg-transparent cursor-pointer">
              🚪 Log Out
            </button>
          </div>
        )}
      </header>
    </>
  );
}

// ── Full-page loading spinner ─────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-gray-100 border-t-forest-700 rounded-full animate-spin" />
    </div>
  );
}

// ── Section tabs (secondary nav inside page body) ─────────────────────────────
function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 sm:gap-1.5 mb-5 sm:mb-6 overflow-x-auto no-scrollbar
                    -mx-4 sm:mx-0 px-4 sm:px-0 pb-1">
      {tabs.map(([key, label]) => (
        <button key={key}
          onClick={() => onChange(key)}
          className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold
                      whitespace-nowrap transition-all border-none cursor-pointer shrink-0
            ${active === key
              ? "bg-forest-700 text-white shadow-sm"
              : "bg-white text-gray-400 hover:text-forest-700 border border-gray-200"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
//  USER TABS
// =============================================================================

// ── 1. Browse Trips ───────────────────────────────────────────────────────────
function BrowseTab({ showToast }) {
  const { user }                    = useAuth();
  const [typeFilter, setTypeFilter] = useState("All");
  const [planFilter, setPlanFilter] = useState("all");
  const [searchQ,    setSearchQ]    = useState("");
  const [detail,     setDetail]     = useState(null); // active detail panel

  // Re-fetches when filters change (dependency tracked in hook)
  const { trips, loading } = useBrowseTrips({
    type: typeFilter !== "All"  ? typeFilter  : undefined,
    plan: planFilter !== "all"  ? planFilter  : undefined,
    q:    searchQ.trim()        || undefined,
  });
  const { joined, joinTrip, isJoining } = useJoinTrip();

  const handleJoin = (trip) =>
    joinTrip(
      trip.id,
      () => { setDetail(null); showToast(`Request sent for ${trip.destination}! 🎉`); },
      (msg) => showToast(msg, "e")
    );

  const planText = (p) =>
    p === "luxury" ? "💎 Luxury" : p === "budget" ? "💰 Budget" : "⚖️ Moderate";

  return (
    <>
      <h1 className="page-title">Find your <em>travel companion</em></h1>
      <p className="page-sub">{trips.length} adventures open right now — discover yours</p>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {["All","Adventure","Cultural","Leisure"].map(f => (
          <button key={f} className={`filter-btn ${typeFilter===f?"active":""}`}
            onClick={() => setTypeFilter(f)}>{f}</button>
        ))}
        <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block"/>
        {[["all","All Plans"],["luxury","💎 Luxury"],["moderate","⚖️ Moderate"],["budget","💰 Budget"]].map(([v,l]) => (
          <button key={v} className={`filter-btn ${planFilter===v?"active":""}`}
            onClick={() => setPlanFilter(v)}>{l}</button>
        ))}
        <div className="ml-auto">
          <SearchBar value={searchQ} onChange={setSearchQ} placeholder="Search destination…" />
        </div>
      </div>

      <TripTable trips={trips} loading={loading} mode="cards" onSelect={setDetail} joined={joined} />

      {/* Slide-in detail panel */}
      {detail && (
        <div className="fixed inset-0 z-[200] flex justify-end animate-fade-in"
          style={{ background:"rgba(8,18,12,0.46)" }}
          onClick={e => e.target===e.currentTarget && setDetail(null)}>
          <div className="w-full max-w-[500px] h-screen bg-cream overflow-y-auto flex flex-col animate-slide-in">
            {/* Hero */}
            <div className="h-64 relative shrink-0">
              <div className="w-full h-full" style={{ background: detail.gradient }} />
              <div className="absolute inset-0" style={{ background:"linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 60%)" }}/>
              <button onClick={() => setDetail(null)}
                className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center
                           rounded-full bg-white/20 border border-white/30 text-white
                           hover:bg-white/35 cursor-pointer text-sm">✕</button>
              <div className="absolute bottom-5 left-6 right-6 text-white">
                <div className="text-xs font-bold uppercase tracking-widest opacity-70">{detail.country}</div>
                <div className="font-serif text-3xl font-medium">{detail.destination}</div>
              </div>
            </div>
            {/* Body */}
            <div className="p-6 flex-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="avatar w-11 h-11 text-sm" style={{ background: detail.host_color }}>{detail.host_av}</div>
                <div>
                  <div className="font-bold">{detail.host}</div>
                  <div className="text-xs text-gray-400">Trip organizer</div>
                </div>
                <span className={`badge badge-${detail.plan_type} ml-auto`}>{planText(detail.plan_type)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 mb-5">
                {[["Dates",detail.dates],["Duration",detail.duration],["Spots Left",`${detail.spots}/${detail.total_spots}`],["Budget",detail.budget]].map(([l,v]) => (
                  <div key={l} className="bg-white rounded-xl p-3 border border-gray-100">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{l}</div>
                    <div className="text-sm font-bold">{v||"—"}</div>
                  </div>
                ))}
              </div>
              <div className="mb-4">
                <div className="font-serif text-base font-semibold text-forest-700 mb-1">About this trip</div>
                <p className="text-sm text-gray-500 leading-relaxed">{detail.description}</p>
              </div>
              {detail.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {detail.tags.map(t => (
                    <span key={t} className="badge bg-forest-50 text-forest-700 border border-forest-100 normal-case tracking-normal">{t}</span>
                  ))}
                </div>
              )}
            </div>
            {/* CTA */}
            <div className="p-5 border-t border-gray-100 bg-white shrink-0">
              <div className="text-xs text-gray-400 mb-3">🙋 {detail.req_count} others have requested to join</div>
              {user?.id === detail.user_id ? (
                <button disabled className="w-full py-3 rounded-xl bg-gray-100 text-gray-400 text-sm font-bold cursor-default">This is your trip</button>
              ) : joined.has(detail.id) ? (
                <button disabled className="w-full py-3 rounded-xl bg-green-700 text-white text-sm font-bold cursor-default">✓ Request Sent</button>
              ) : detail.spots <= 0 ? (
                <button disabled className="w-full py-3 rounded-xl bg-gray-300 text-gray-500 text-sm font-bold cursor-not-allowed">Trip is Full</button>
              ) : (
                <button
                  disabled={isJoining(detail.id)}
                  onClick={() => handleJoin(detail)}
                  className="w-full py-3 rounded-xl bg-forest-700 hover:bg-forest-600 text-white text-sm font-bold transition-all cursor-pointer disabled:opacity-60">
                  {isJoining(detail.id) ? "Sending…" : "Request to Join"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── 2. Post Trip ──────────────────────────────────────────────────────────────
function PostTripTab({ showToast, onPublished }) {
  const form = useTripForm(trip => {
    showToast(`Trip to ${trip.destination} published! 🎉`);
    onPublished(); // switch to My Trips
  });
  return (
    <>
      <h1 className="page-title">Post your <em>adventure</em></h1>
      <p className="page-sub">Share your travel plan and invite companions to join</p>
      <TripForm {...form} />
    </>
  );
}

// ── 3. My Trips ───────────────────────────────────────────────────────────────
function MyTripsTab({ showToast }) {
  const { trips, loading, removeTrip }     = useMyTrips();
  const [selectedTrip, setSelected]        = useState(null);
  const { requests, loading: rLoading, respondToRequest } = useJoinRequests(selectedTrip?.id);

  const handleDelete = async id => {
    if (!window.confirm("Delete this trip? This cannot be undone.")) return;
    try { await removeTrip(id); showToast("Trip deleted."); }
    catch { showToast("Failed to delete.", "e"); }
  };

  const handleRespond = async (reqId, status) => {
    try {
      await respondToRequest(reqId, status);
      showToast(status === "accepted" ? "Request accepted! ✓" : "Request declined.");
    } catch { showToast("Failed to update.", "e"); }
  };

  return (
    <>
      <h1 className="page-title">My <em>Trips</em></h1>
      <p className="page-sub">Manage your posted adventures and review join requests</p>
      <TripTable trips={trips} loading={loading} mode="table" onSelect={setSelected} onDelete={handleDelete} isOwner />

      <Modal open={!!selectedTrip} onClose={() => setSelected(null)}
        title={`Join Requests — ${selectedTrip?.destination}`} maxWidth="max-w-xl">
        {rLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-gray-100 border-t-forest-700 rounded-full animate-spin"/>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">📭</div>
            <div className="text-sm">No requests yet for this trip.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 bg-cream">
                <div className="avatar w-10 h-10 text-xs" style={{ background: req.color }}>{req.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{req.name}</div>
                  <div className="text-xs text-gray-400 truncate">{req.bio}</div>
                  <div className="text-xs text-gray-400">Age {req.age} · {req.requested_on}</div>
                </div>
                <span className={`badge badge-${req.status} shrink-0`}>{req.status}</span>
                {req.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <button className="btn-primary text-xs px-3 py-1.5" onClick={() => handleRespond(req.id,"accepted")}>✓ Accept</button>
                    <button className="btn-danger text-xs px-3 py-1.5"  onClick={() => handleRespond(req.id,"declined")}>✕ Decline</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}

// ── 4. My Requests ────────────────────────────────────────────────────────────
function MyRequestsTab() {
  const { requests, loading } = useMyRequests();
  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-[3px] border-gray-100 border-t-forest-700 rounded-full animate-spin"/></div>;
  return (
    <>
      <h1 className="page-title">My <em>Requests</em></h1>
      <p className="page-sub">Track all your outgoing join requests and their current status</p>
      {requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <div className="font-serif text-xl text-forest-700 mb-1">No requests yet</div>
          <div className="text-sm">Browse trips and send your first join request!</div>
        </div>
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Destination</th><th>Host</th><th>Dates</th><th>Plan</th><th>Requested</th><th>Status</th></tr></thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id}>
                  <td><strong className="text-sm">{r.destination}</strong><br/><span className="text-xs text-gray-400">{r.country}</span></td>
                  <td className="text-sm text-gray-600">{r.host}</td>
                  <td className="text-xs text-gray-500">{r.dates}</td>
                  <td><span className={`badge badge-${r.plan_type}`}>{r.plan_type}</span></td>
                  <td className="text-xs text-gray-400">{r.requested_on}</td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// =============================================================================
//  ADMIN TABS
// =============================================================================

function AdminOverview({ stats, trips }) {
  return (
    <>
      <h1 className="page-title">Admin <em>Overview</em></h1>
      <p className="page-sub">Platform-wide statistics at a glance</p>
      <StatsBar stats={stats} />
      <div className="card overflow-hidden overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <span className="font-serif text-lg font-semibold text-forest-700">Recent Trips</span>
          <span className="text-xs text-gray-400">{trips.length} total</span>
        </div>
        <table className="data-table">
          <thead><tr><th>Destination</th><th>Host</th><th>Type</th><th>Plan</th><th>Spots</th><th>Requests</th></tr></thead>
          <tbody>
            {trips.slice(0,8).map(t => (
              <tr key={t.id}>
                <td><strong className="text-sm">{t.destination}</strong><br/><span className="text-xs text-gray-400">{t.country}</span></td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="avatar w-7 h-7 text-[11px]" style={{ background: t.host_color }}>{t.host_av}</div>
                    <span className="text-sm">{t.host}</span>
                  </div>
                </td>
                <td><span className={`badge badge-${t.trip_type?.toLowerCase()}`}>{t.trip_type}</span></td>
                <td><span className={`badge badge-${t.plan_type}`}>{t.plan_type}</span></td>
                <td className="font-semibold">{t.spots}/{t.total_spots}</td>
                <td className="font-semibold">{t.req_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AdminUsers({ users, onUpdate, onToggle, onDelete, showToast }) {
  const [editUser, setEditUser] = useState(null);
  const [ef, setEf]             = useState({});

  const openEdit = u => { setEditUser(u); setEf({ name:u.name, email:u.email, age:u.age, bio:u.bio||"", status:u.status }); };

  const saveEdit = async () => {
    try { await onUpdate(editUser.id, ef); setEditUser(null); showToast("User updated ✓"); }
    catch (e) { showToast(e.response?.data?.error||"Update failed.","e"); }
  };

  const handleToggle = async u => {
    try { const s = await onToggle(u.id, u.status); showToast(`User ${s}.`); }
    catch { showToast("Failed.","e"); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Permanently delete ${name}?`)) return;
    try { await onDelete(id); showToast("User deleted."); }
    catch { showToast("Failed.","e"); }
  };

  return (
    <>
      <h1 className="page-title">User <em>Management</em></h1>
      <p className="page-sub">Edit profiles, suspend accounts, or permanently remove users</p>
      <div className="card overflow-hidden overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <span className="font-serif text-lg font-semibold text-forest-700">All Users ({users.length})</span>
        </div>
        <table className="data-table">
          <thead><tr><th>User</th><th>Email</th><th>Age</th><th>Joined</th><th>Trips</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-2.5">
                    <div className="avatar w-9 h-9 text-xs" style={{ background: u.color }}>{u.avatar}</div>
                    <div>
                      <div className="font-semibold text-sm">{u.name}</div>
                      <div className="text-xs text-gray-400 max-w-[150px] truncate">{u.bio}</div>
                    </div>
                  </div>
                </td>
                <td className="text-sm text-gray-500">{u.email}</td>
                <td>{u.age}</td>
                <td className="text-xs text-gray-400">{u.joined}</td>
                <td className="font-semibold">{u.trips_count}</td>
                <td><span className={`badge badge-${u.status}`}>{u.status}</span></td>
                <td>
                  <div className="flex gap-1.5 flex-wrap">
                    <button className="btn-secondary text-xs px-2.5 py-1.5" onClick={() => openEdit(u)}>Edit</button>
                    <button onClick={() => handleToggle(u)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold border-none cursor-pointer transition-all
                        ${u.status==="active" ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-forest-50 text-forest-700 hover:bg-forest-100"}`}>
                      {u.status==="active" ? "Suspend" : "Activate"}
                    </button>
                    <button className="btn-danger text-xs px-2.5 py-1.5" onClick={() => handleDelete(u.id, u.name)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`Edit — ${editUser?.name}`}>
        {[["name","Full Name","text"],["email","Email","email"],["age","Age","number"],["bio","Bio","text"]].map(([k,l,t]) => (
          <div key={k} className="mb-4">
            <label className="form-label">{l}</label>
            <input className="form-input" type={t} value={ef[k]||""} onChange={e => setEf(f => ({...f,[k]:e.target.value}))} />
          </div>
        ))}
        <div className="mb-5">
          <label className="form-label">Status</label>
          <select className="form-input" value={ef.status||"active"} onChange={e => setEf(f => ({...f,status:e.target.value}))}>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <div className="flex gap-3 justify-end">
          <button className="btn-secondary" onClick={() => setEditUser(null)}>Cancel</button>
          <button className="btn-primary px-6" onClick={saveEdit}>Save Changes</button>
        </div>
      </Modal>
    </>
  );
}

function AdminTrips({ trips, onRemove, showToast }) {
  const handleRemove = async (id, dest) => {
    if (!window.confirm(`Remove the trip to ${dest}?`)) return;
    try { await onRemove(id); showToast("Trip removed."); }
    catch { showToast("Failed to remove.","e"); }
  };

  return (
    <>
      <h1 className="page-title">All <em>Trips</em></h1>
      <p className="page-sub">Review and moderate every trip posted on the platform</p>
      <div className="card overflow-hidden overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <span className="font-serif text-lg font-semibold text-forest-700">All Trips ({trips.length})</span>
        </div>
        <table className="data-table">
          <thead><tr><th>Destination</th><th>Host</th><th>Dates</th><th>Type</th><th>Plan</th><th>Budget</th><th>Requests</th><th>Action</th></tr></thead>
          <tbody>
            {trips.map(t => (
              <tr key={t.id}>
                <td><strong className="text-sm">{t.destination}</strong><br/><span className="text-xs text-gray-400">{t.country}</span></td>
                <td className="text-sm">{t.host}</td>
                <td className="text-xs text-gray-500">{t.dates}</td>
                <td><span className={`badge badge-${t.trip_type?.toLowerCase()}`}>{t.trip_type}</span></td>
                <td><span className={`badge badge-${t.plan_type}`}>{t.plan_type}</span></td>
                <td className="text-sm font-semibold">{t.budget}</td>
                <td className="font-semibold">{t.req_count}</td>
                <td><button className="btn-danger text-xs px-2.5 py-1.5" onClick={() => handleRemove(t.id, t.destination)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// =============================================================================
//  SHELLS
// =============================================================================

const ADMIN_TABS = [["overview","Overview"],["users","Users"],["trips","Trips"]];

function AdminShell({ showToast }) {
  const [tab, setTab] = useState("overview");
  const { users, trips, stats, loading, updateUser, toggleUserStatus, removeUser, removeTrip } = useAdminData();

  if (loading) return <PageLoader />;

  return (
    <>
      <TabBar tabs={ADMIN_TABS} active={tab} onChange={setTab} />
      {tab==="overview" && <AdminOverview stats={stats} trips={trips} />}
      {tab==="users"    && <AdminUsers users={users} onUpdate={updateUser} onToggle={toggleUserStatus} onDelete={removeUser} showToast={showToast} />}
      {tab==="trips"    && <AdminTrips  trips={trips} onRemove={removeTrip} showToast={showToast} />}
    </>
  );
}

const USER_TABS = [
  ["browse",   "Browse"],
  ["post",     "Post Trip"],
  ["my-trips", "My Trips"],
  ["requests", "My Requests"],
  ["ai",       "AI Assistant"],
  ["map",      "Map"],
];

function UserShell({ showToast }) {
  const [tab, setTab] = useState("browse");
  return (
    <>
      <TabBar tabs={USER_TABS} active={tab} onChange={setTab} />
      {tab==="browse"   && <BrowseTab showToast={showToast} />}
      {tab==="post"     && <PostTripTab showToast={showToast} onPublished={() => setTab("my-trips")} />}
      {tab==="my-trips" && <MyTripsTab showToast={showToast} />}
      {tab==="requests" && <MyRequestsTab />}
      {tab==="ai"       && <AISuggestModal showToast={showToast} />}
      {tab==="map"      && <MapView />}
    </>
  );
}

// =============================================================================
//  ROOT
// =============================================================================
export default function App() {
  const { user, loading, logout } = useAuth();
  const [toast, setToast]              = useState(null);
  const [showEditProfile, setShowEdit] = useState(false); // ← Feature 1 state

  const showToast = (msg, type = "s") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3100);
  };

  if (loading) return <PageLoader />;

  if (!user) return (
    <>
      <AuthPage showToast={showToast} />
      <Toast toast={toast} />
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      {/*
        Pass onEditProfile callback to Header.
        Header's avatar and "✏️ Profile" button both call this.
      */}
      <Header user={user} onLogout={logout} onEditProfile={() => setShowEdit(true)} />

      <main className="flex-1 max-w-[1300px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-7 lg:py-8">
        {user.role === "admin"
          ? <AdminShell showToast={showToast} />
          : <UserShell  showToast={showToast} />
        }
      </main>

      {/*
        EditProfileModal is mounted at the App root so it's available
        from any tab without prop-drilling.
      */}
      <EditProfileModal
        open={showEditProfile}
        onClose={() => setShowEdit(false)}
        showToast={showToast}
      />

      <Toast toast={toast} />
    </div>
  );
}
