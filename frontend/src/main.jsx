// src/main.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  React entry point
//  Wraps the app in AuthProvider so all components can call useAuth().
// ─────────────────────────────────────────────────────────────────────────────

import React       from "react";
import ReactDOM    from "react-dom/client";
import App         from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.css"; // Tailwind + custom global styles

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* AuthProvider makes user/login/logout available to every component */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
