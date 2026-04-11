// src/main.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  React entry point
//
//  GoogleOAuthProvider (from @react-oauth/google) must wrap the entire app
//  so any component can use the Google Sign-In button.
//  The clientId is read from the VITE_GOOGLE_CLIENT_ID env variable.
//
//  Create frontend/.env:
//    VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
// ─────────────────────────────────────────────────────────────────────────────

import React       from "react";
import ReactDOM    from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App         from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/*
      GoogleOAuthProvider initialises the Google Sign-In SDK.
      If VITE_GOOGLE_CLIENT_ID is empty, Google buttons will not appear
      but the rest of the app works normally.
    */}
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
