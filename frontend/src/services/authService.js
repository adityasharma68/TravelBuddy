// src/services/authService.js
// ─────────────────────────────────────────────────────────────────────────────
//  Auth Service — All API calls related to authentication
//
//  Why a service layer?
//    Keeps API call logic OUT of components and hooks.
//    Components stay clean; API details stay here.
//    Easy to swap the base URL or add headers in one place.
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";

// Axios instance — base URL is /api (proxied to Express in dev via vite.config.js)
const api = axios.create({ baseURL: "/api" });

// ── Request Interceptor ────────────────────────────────────────────────────────
// Automatically attach the JWT from localStorage to every request header.
// This way every service call is authenticated without repeating the header logic.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tb_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response Interceptor ───────────────────────────────────────────────────────
// Auto-logout if the server returns 401 (token expired / invalid).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("tb_token");
      localStorage.removeItem("tb_user");
      window.location.reload(); // Force re-render to show auth page
    }
    return Promise.reject(error);
  }
);

// Export the configured axios instance so other services can import it
export { api };

// ── Auth API Calls ─────────────────────────────────────────────────────────────

/**
 * Register a new user account.
 * @param {{ name, email, password, age?, bio? }} data
 */
export const registerUser = (data) => api.post("/auth/register", data);

/**
 * Log in with email and password.
 * @param {{ email, password }} data
 * @returns JWT token + user object
 */
export const loginUser = (data) => api.post("/auth/login", data);

/**
 * Fetch the currently logged-in user's fresh data from DB.
 * Used on app load to re-validate the stored token.
 */
export const getMe = () => api.get("/auth/me");

/**
 * Update the current user's profile (name, age, bio).
 * Returns the updated user object.
 * @param {{ name, age, bio }} data
 */
export const updateProfile = (data) => api.put("/auth/profile", data);

/**
 * Change the current user's password.
 * Requires the existing password for verification.
 * @param {{ currentPassword, newPassword }} data
 */
export const changePassword = (data) => api.put("/auth/password", data);

/**
 * Google OAuth — send the ID token received from Google Sign-In to our backend.
 * @param {{ credential: string }} data  — the ID token from @react-oauth/google
 */
export const googleLogin = (data) => api.post("/auth/google", data);

/**
 * Forgot password — sends a 6-digit OTP to the user's email.
 * @param {{ email: string }} data
 */
export const forgotPassword = (data) => api.post("/auth/forgot-password", data);

/**
 * Reset password — verify the OTP and set a new password.
 * @param {{ email: string, otp: string, newPassword: string }} data
 */
export const resetPassword = (data) => api.post("/auth/reset-password", data);

/**
 * Upload profile picture. Sends multipart/form-data.
 * @param {FormData} formData  — must contain field "image"
 */
export const uploadAvatar = (formData) =>
  api.post("/upload/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

/**
 * Remove profile picture.
 */
export const deleteAvatar = () => api.delete("/upload/avatar");

/**
 * Upload a trip image. Returns { imageUrl }.
 * @param {FormData} formData  — must contain field "image"
 */
export const uploadTripImage = (formData) =>
  api.post("/upload/trip-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
