// src/context/AuthContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  Auth Context — Global authentication state
//
//  React Context lets us share auth state (user, token, logout fn)
//  across the entire component tree without prop-drilling.
//
//  Usage:
//    const { user, loginCtx, logout } = useAuth();
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useEffect } from "react";
import { getMe } from "../services/authService";

// Create the context — default value is null (unauthenticated)
const AuthContext = createContext(null);

// ── AuthProvider ──────────────────────────────────────────────────────────────
// Wrap the entire app with this so all children can call useAuth().
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // true = still checking localStorage

  // On first load, check if there's a saved token and try to restore the session
  useEffect(() => {
    const token = localStorage.getItem("tb_token");
    const saved = localStorage.getItem("tb_user");

    if (token && saved) {
      // Optimistically set user from localStorage so UI isn't blank
      try { setUser(JSON.parse(saved)); } catch { /* ignore corrupt data */ }

      // Then verify the token is still valid by hitting /api/auth/me
      getMe()
        .then(({ data }) => {
          setUser(data);
          localStorage.setItem("tb_user", JSON.stringify(data)); // Keep fresh
        })
        .catch(() => logout()) // Token invalid — clear session
        .finally(() => setLoading(false));
    } else {
      setLoading(false); // No token — show login page immediately
    }
  }, []);

  // ── loginCtx ──────────────────────────────────────────────────────────────
  // Called after a successful /api/auth/login or /register response.
  // Persists token + user to localStorage and updates state.
  const loginCtx = (token, userData) => {
    localStorage.setItem("tb_token", token);
    localStorage.setItem("tb_user", JSON.stringify(userData));
    setUser(userData);
  };

  // ── logout ────────────────────────────────────────────────────────────────
  // Clears all stored auth data and resets state → triggers re-render to login
  const logout = () => {
    localStorage.removeItem("tb_token");
    localStorage.removeItem("tb_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loginCtx, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── useAuth hook ──────────────────────────────────────────────────────────────
// Convenient hook so components don't need to import useContext + AuthContext
export const useAuth = () => useContext(AuthContext);
