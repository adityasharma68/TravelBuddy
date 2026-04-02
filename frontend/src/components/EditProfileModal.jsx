// src/components/EditProfileModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  EditProfileModal — Lets a logged-in user update their own profile.
//
//  Two sections in tabs:
//    1. "Profile"  → name, age, bio (calls PUT /api/auth/profile)
//    2. "Password" → current + new password (calls PUT /api/auth/password)
//
//  On successful profile update:
//    • Updates AuthContext (global state) so the header avatar/name refreshes
//    • Persists fresh user to localStorage so next reload keeps changes
//
//  Props:
//    open      {boolean}   — controls visibility
//    onClose   {function}  — close the modal
//    showToast {function}  — display success/error notification
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useAuth }             from "../context/AuthContext";
import { updateProfile, changePassword } from "../services/authService";

export default function EditProfileModal({ open, onClose, showToast }) {
  const { user, setUser } = useAuth(); // setUser lets us refresh global state

  // ── Which sub-tab is active ────────────────────────────────────────────────
  const [tab, setTab] = useState("profile"); // "profile" | "password"

  // ── Profile form state ─────────────────────────────────────────────────────
  const [profile, setProfile] = useState({ name: "", age: "", bio: "" });

  // ── Password form state ────────────────────────────────────────────────────
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword:     "",
    confirmPassword: "",
  });

  // ── Loading + error state ──────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // ── Pre-fill profile form when modal opens ─────────────────────────────────
  // useEffect with [open] dependency so it re-fills every time modal opens
  useEffect(() => {
    if (open && user) {
      setProfile({
        name: user.name  || "",
        age:  user.age   || "",
        bio:  user.bio   || "",
      });
      // Clear password fields and error on every open
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setError("");
      setTab("profile");
    }
  }, [open, user]);

  if (!open) return null;

  // ── Generic field updater factories ───────────────────────────────────────
  const setProfileField   = (key) => (e) => setProfile(p   => ({ ...p,   [key]: e.target.value }));
  const setPasswordField  = (key) => (e) => setPasswords(p => ({ ...p,   [key]: e.target.value }));

  // ── Avatar preview (initials from current name input) ─────────────────────
  const previewAvatar = profile.name.trim()
    .split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase() || user?.avatar;

  // ─────────────────────────────────────────────────────────────────────────
  //  Submit: Update Profile
  // ─────────────────────────────────────────────────────────────────────────
  const handleProfileSave = async () => {
    setError("");
    if (!profile.name.trim()) {
      setError("Name cannot be empty.");
      return;
    }

    setLoading(true);
    try {
      // Call PUT /api/auth/profile
      const { data: updatedUser } = await updateProfile({
        name: profile.name.trim(),
        age:  parseInt(profile.age) || 25,
        bio:  profile.bio.trim(),
      });

      // Update global auth state so header and other components reflect changes
      setUser(updatedUser);

      // Also persist to localStorage so next page reload keeps changes
      localStorage.setItem("tb_user", JSON.stringify(updatedUser));

      showToast("Profile updated successfully! ✓");
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  Submit: Change Password
  // ─────────────────────────────────────────────────────────────────────────
  const handlePasswordSave = async () => {
    setError("");

    // Client-side validation before hitting the API
    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      setError("All password fields are required.");
      return;
    }
    if (passwords.newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // Call PUT /api/auth/password
      await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword:     passwords.newPassword,
      });

      showToast("Password changed successfully! 🔐");
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // ── Backdrop — clicking outside closes the modal ────────────────────────
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(0,0,0,0.38)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* ── Modal card ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl w-full max-w-md shadow-lift overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="px-7 pt-6 pb-0">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif text-xl font-semibold text-forest-700">
              Edit Profile
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full
                         border border-gray-200 text-gray-400 hover:bg-gray-50
                         hover:text-gray-700 transition-all text-sm cursor-pointer bg-white">
              ✕
            </button>
          </div>

          {/* ── Avatar Preview ───────────────────────────────────────────── */}
          <div className="flex items-center gap-4 mb-5 p-4 bg-cream rounded-xl border border-gray-100">
            {/* Live avatar preview updates as name is typed */}
            <div
              className="avatar w-14 h-14 text-lg border-2 border-white shadow-sm"
              style={{ background: user?.color || "#1a3d2b" }}>
              {previewAvatar}
            </div>
            <div>
              <div className="font-bold text-gray-800">
                {profile.name || user?.name}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {user?.email}
                {/* Email is read-only — shown for reference only */}
                <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-400">
                  cannot change
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                Member since {user?.joined}
              </div>
            </div>
          </div>

          {/* ── Sub-tabs: Profile | Password ────────────────────────────── */}
          <div className="flex gap-1 bg-cream rounded-xl p-1 mb-5">
            {[["profile", "👤 Profile Info"], ["password", "🔐 Change Password"]].map(([k, l]) => (
              <button
                key={k}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all
                            border-none cursor-pointer
                  ${tab === k
                    ? "bg-forest-700 text-white"
                    : "bg-transparent text-gray-400 hover:text-forest-700"}`}
                onClick={() => { setTab(k); setError(""); }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* ── Form Body ────────────────────────────────────────────────────── */}
        <div className="px-7 pb-7">
          {/* Error banner */}
          {error && (
            <div className="mb-4 px-3.5 py-2.5 bg-red-50 border border-red-100
                            rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ── Tab 1: Profile Info ─────────────────────────────────────── */}
          {tab === "profile" && (
            <div>
              {/* Name */}
              <div className="mb-4">
                <label className="form-label">Full Name *</label>
                <input
                  className="form-input"
                  placeholder="Your full name"
                  value={profile.name}
                  onChange={setProfileField("name")}
                />
                {/* Live avatar hint */}
                <p className="text-xs text-gray-400 mt-1">
                  Avatar initials update automatically as you type.
                </p>
              </div>

              {/* Age */}
              <div className="mb-4">
                <label className="form-label">Age</label>
                <input
                  className="form-input"
                  type="number"
                  min={13}
                  max={100}
                  placeholder="25"
                  value={profile.age}
                  onChange={setProfileField("age")}
                />
              </div>

              {/* Bio */}
              <div className="mb-6">
                <label className="form-label">Bio</label>
                <textarea
                  className="form-input min-h-[80px]"
                  placeholder="Tell other travelers about yourself…"
                  value={profile.bio}
                  onChange={setProfileField("bio")}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {profile.bio.length}/200 characters
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <button className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="btn-primary px-6 py-2.5"
                  onClick={handleProfileSave}
                  disabled={loading}>
                  {loading ? "Saving…" : "Save Profile →"}
                </button>
              </div>
            </div>
          )}

          {/* ── Tab 2: Change Password ──────────────────────────────────── */}
          {tab === "password" && (
            <div>
              {/* Current password — required to verify identity */}
              <div className="mb-4">
                <label className="form-label">Current Password *</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Your existing password"
                  value={passwords.currentPassword}
                  onChange={setPasswordField("currentPassword")}
                />
              </div>

              {/* New password */}
              <div className="mb-4">
                <label className="form-label">New Password *</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="At least 6 characters"
                  value={passwords.newPassword}
                  onChange={setPasswordField("newPassword")}
                />
              </div>

              {/* Confirm new password — client-side match check */}
              <div className="mb-6">
                <label className="form-label">Confirm New Password *</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Repeat your new password"
                  value={passwords.confirmPassword}
                  onChange={setPasswordField("confirmPassword")}
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordSave()}
                />
                {/* Live match indicator */}
                {passwords.confirmPassword && (
                  <p className={`text-xs mt-1 font-semibold
                    ${passwords.newPassword === passwords.confirmPassword
                      ? "text-green-600" : "text-red-500"}`}>
                    {passwords.newPassword === passwords.confirmPassword
                      ? "✓ Passwords match"
                      : "✗ Passwords do not match"}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <button className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="btn-primary px-6 py-2.5"
                  onClick={handlePasswordSave}
                  disabled={loading}>
                  {loading ? "Updating…" : "Change Password 🔐"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
