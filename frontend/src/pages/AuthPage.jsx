// src/pages/AuthPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  Auth Page — Sliding panel design (inspired by split-screen login pattern)
//
//  Layout:
//    ┌──────────────────────────┬──────────────────────────┐
//    │    Sign Up Form          │      Overlay Panel       │
//    ├──────────────────────────┤  (slides left/right to   │
//    │    Sign In Form          │   reveal each form)      │
//    └──────────────────────────┴──────────────────────────┘
//
//  When mode = "login"  → overlay is on RIGHT, showing sign-in form on left
//  When mode = "signup" → overlay slides LEFT, showing sign-up form on right
//
//  Adapted for Travel Buddy: forest green + amber brand, transparent logo PNGs,
//  particle background, glassmorphism inputs, and smooth CSS transitions.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useAuth }             from "../context/AuthContext";
import { loginUser, registerUser } from "../services/authService";

export default function AuthPage({ showToast }) {
  const { loginCtx }              = useAuth();
  const [mode, setMode]           = useState("login");   // "login" | "signup"
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [mounted, setMounted]     = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ name: "", email: "", password: "", age: "", bio: "" });

  // Entrance animation
  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);

  const setL = (key) => (e) => setLoginForm(f => ({ ...f, [key]: e.target.value }));
  const setS = (key) => (e) => setSignupForm(f => ({ ...f, [key]: e.target.value }));

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) { setError("Email and password are required."); return; }
    setError(""); setLoading(true);
    try {
      const { data } = await loginUser(loginForm);
      loginCtx(data.token, data.user);
      showToast(`Welcome back, ${data.user.name.split(" ")[0]}! 🎒`);
    } catch (err) { setError(err.response?.data?.error || "Invalid credentials."); }
    finally { setLoading(false); }
  };

  const handleSignup = async () => {
    if (!signupForm.name || !signupForm.email || !signupForm.password) { setError("Please fill all required fields."); return; }
    setError(""); setLoading(true);
    try {
      const { data } = await registerUser(signupForm);
      loginCtx(data.token, data.user);
      showToast(`Welcome to Travel Buddy, ${data.user.name.split(" ")[0]}! ✈️`);
    } catch (err) { setError(err.response?.data?.error || "Registration failed."); }
    finally { setLoading(false); }
  };

  const isSignUp = mode === "signup";

  return (
    <>
      {/* ── All keyframe animations ─────────────────────────────────────── */}
      <style>{`
        /* Particle float animations */
        @keyframes floatUp   { 0%{transform:translateY(0) scale(1);opacity:.7} 50%{transform:translateY(-22px) scale(1.1);opacity:1} 100%{transform:translateY(0) scale(1);opacity:.7} }
        @keyframes floatSide { 0%{transform:translateX(0) rotate(0deg);opacity:.5} 50%{transform:translateX(14px) rotate(6deg);opacity:.9} 100%{transform:translateX(0) rotate(0deg);opacity:.5} }
        @keyframes pulse     { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(1.2);opacity:.8} }

        /* Page entrance */
        @keyframes containerIn { from{opacity:0;transform:scale(.94) translateY(18px)} to{opacity:1;transform:scale(1) translateY(0)} }

        /* Shimmer on overlay gradient */
        @keyframes shimmerBg   { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }

        /* Glow ring around icon */
        @keyframes glowRing    { 0%,100%{box-shadow:0 0 18px 4px rgba(249,115,22,.35)} 50%{box-shadow:0 0 32px 10px rgba(249,115,22,.6)} }

        /* Staggered form field entrance */
        @keyframes fieldIn     { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .f0{animation:fieldIn .4s .05s both} .f1{animation:fieldIn .4s .12s both}
        .f2{animation:fieldIn .4s .19s both} .f3{animation:fieldIn .4s .26s both}
        .f4{animation:fieldIn .4s .33s both} .f5{animation:fieldIn .4s .40s both}

        /* Spinner */
        @keyframes spin { to{transform:rotate(360deg)} }
        .spin { animation: spin .7s linear infinite; }

        /* Container entrance */
        .auth-wrap { animation: containerIn .6s cubic-bezier(.22,1,.36,1) forwards; }

        /* Overlay panel transitions */
        .auth-container { position:relative; overflow:hidden; }

        /* Sign-in panel */
        .sign-in-panel {
          position:absolute; top:0; left:0; width:50%; height:100%;
          transition:all .7s cubic-bezier(.77,0,.175,1);
          z-index:2;
        }
        .auth-container.signup .sign-in-panel { transform:translateX(100%); }

        /* Sign-up panel */
        .sign-up-panel {
          position:absolute; top:0; left:0; width:50%; height:100%;
          opacity:0; z-index:1;
          transition:all .7s cubic-bezier(.77,0,.175,1);
        }
        .auth-container.signup .sign-up-panel {
          transform:translateX(100%); opacity:1; z-index:5;
          animation: revealPanel .7s cubic-bezier(.77,0,.175,1);
        }
        @keyframes revealPanel { 0%,49%{opacity:0;z-index:1} 50%,100%{opacity:1;z-index:5} }

        /* Overlay panel */
        .overlay-wrap {
          position:absolute; top:0; left:50%; width:50%; height:100%;
          z-index:100; overflow:hidden;
          transition:transform .7s cubic-bezier(.77,0,.175,1);
        }
        .auth-container.signup .overlay-wrap { transform:translateX(-100%); }

        .overlay-inner {
          position:relative; left:-100%; width:200%; height:100%;
          background: linear-gradient(135deg, #1a3d2b 0%, #2a5c40 30%, #c9640a 70%, #f97316 100%);
          background-size:200% 200%;
          animation: shimmerBg 8s ease infinite;
          transition:transform .7s cubic-bezier(.77,0,.175,1);
        }
        .auth-container.signup .overlay-inner { transform:translateX(50%); }

        .overlay-panel-inner {
          position:absolute; top:0; width:50%; height:100%;
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          padding:2.5rem 2rem; text-align:center; color:#fff;
          transition:transform .7s cubic-bezier(.77,0,.175,1);
        }
        .overlay-left  { transform:translateX(-18%); }
        .overlay-right { right:0; }
        .auth-container.signup .overlay-left  { transform:translateX(0); }
        .auth-container.signup .overlay-right { transform:translateX(18%); }

        /* Input focus glow */
        .auth-input:focus {
          border-color: #f97316 !important;
          box-shadow: 0 0 0 3px rgba(249,115,22,.18), inset 0 1px 3px rgba(0,0,0,.08) !important;
          background: #fff !important;
        }

        /* Button press */
        .auth-btn:active { transform:scale(.97); }

        /* Ripple */
        @keyframes ripple { to { transform:scale(3); opacity:0; } }
        .ripple-effect {
          position:absolute; border-radius:50%;
          background:rgba(255,255,255,.3);
          animation:ripple .55s ease-out forwards;
          pointer-events:none;
        }
      `}</style>

      {/* ── Full-screen background ──────────────────────────────────────── */}
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8"
        style={{ background:"linear-gradient(150deg,#050f08 0%,#0d2218 45%,#08180e 100%)" }}>

        {/* Background glow orbs */}
        {[
          { w:520,h:520,top:"-130px",left:"-100px",  color:"rgba(249,115,22,.1)" },
          { w:600,h:600,bottom:"-160px",right:"-90px",color:"rgba(14,165,233,.07)" },
          { w:350,h:350,top:"35%",    left:"30%",    color:"rgba(26,61,43,.45)" },
        ].map((o,i) => (
          <div key={i} className="absolute pointer-events-none rounded-full" style={{
            width:o.w, height:o.h, top:o.top, left:o.left, bottom:o.bottom, right:o.right,
            background:`radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
          }}/>
        ))}

        {/* Floating particles */}
        {[
          {s:6, x:"7%",  y:"12%", c:"rgba(249,115,22,.6)",  a:"floatUp 6.5s ease-in-out infinite"},
          {s:9, x:"20%", y:"72%", c:"rgba(14,165,233,.45)", a:"floatSide 8s ease-in-out infinite 1s"},
          {s:5, x:"84%", y:"18%", c:"rgba(249,115,22,.5)",  a:"floatUp 7s ease-in-out infinite 2s"},
          {s:7, x:"78%", y:"78%", c:"rgba(255,255,255,.12)",a:"pulse 5s ease-in-out infinite .5s"},
          {s:4, x:"48%", y:"6%",  c:"rgba(14,165,233,.3)",  a:"floatSide 9s ease-in-out infinite 3s"},
          {s:11,x:"91%", y:"50%", c:"rgba(249,115,22,.2)",  a:"floatUp 10s ease-in-out infinite 1.5s"},
          {s:3, x:"33%", y:"91%", c:"rgba(255,255,255,.18)",a:"pulse 7s ease-in-out infinite 4s"},
          {s:6, x:"60%", y:"38%", c:"rgba(14,165,233,.18)", a:"floatSide 7.5s ease-in-out infinite 2.5s"},
        ].map((p,i) => (
          <div key={i} className="absolute rounded-full pointer-events-none" style={{
            width:p.s, height:p.s, left:p.x, top:p.y,
            background:p.c, animation:p.a,
          }}/>
        ))}

        {/* ── Main auth container ───────────────────────────────────────── */}
        <div
          className={`auth-wrap auth-container ${isSignUp ? "signup" : ""} w-full relative`}
          style={{
            maxWidth: 820,
            minHeight: 520,
            borderRadius: 24,
            boxShadow: "0 28px 80px rgba(0,0,0,.55), 0 4px 20px rgba(0,0,0,.3)",
            opacity: mounted ? 1 : 0,
          }}>

          {/* ══ SIGN-IN FORM ═══════════════════════════════════════════ */}
          <div className="sign-in-panel" style={{ background:"#fff", borderRadius:"inherit" }}>
            <FormPanel
              title="Sign In"
              subtitle="Welcome back, traveler!"
              error={isSignUp ? "" : error}
              loading={loading && !isSignUp}
              onSubmit={handleLogin}
              submitLabel="Sign In"
            >
              <div className="f0">
                <AuthInput icon="✉" type="email"    placeholder="Email address"  value={loginForm.email}    onChange={setL("email")} />
              </div>
              <div className="f1">
                <AuthInput icon="🔒" type="password" placeholder="Password"       value={loginForm.password} onChange={setL("password")}
                  onKeyDown={(e)=>e.key==="Enter"&&handleLogin()} />
              </div>
              <div className="f2">
                <a href="#" className="text-xs text-gray-400 hover:text-amber-600 transition-colors mt-1 inline-block">
                  Forgot your password?
                </a>
              </div>
            </FormPanel>
          </div>

          {/* ══ SIGN-UP FORM ════════════════════════════════════════════ */}
          <div className="sign-up-panel" style={{ background:"#fff", borderRadius:"inherit" }}>
            <FormPanel
              title="Create Account"
              subtitle="Start your adventure today"
              error={isSignUp ? error : ""}
              loading={loading && isSignUp}
              onSubmit={handleSignup}
              submitLabel="Create Account"
            >
              <div className="f0"><AuthInput icon="👤" type="text"     placeholder="Full name *"     value={signupForm.name}     onChange={setS("name")} /></div>
              <div className="f1"><AuthInput icon="✉"  type="email"    placeholder="Email address *" value={signupForm.email}    onChange={setS("email")} /></div>
              <div className="f2"><AuthInput icon="🔒" type="password" placeholder="Password *"      value={signupForm.password} onChange={setS("password")} /></div>
              <div className="f3"><AuthInput icon="🎂" type="number"   placeholder="Age (optional)"  value={signupForm.age}      onChange={setS("age")} /></div>
              <div className="f4"><AuthInput icon="📝" type="text"     placeholder="Bio (optional)"  value={signupForm.bio}      onChange={setS("bio")} /></div>
            </FormPanel>
          </div>

          {/* ══ SLIDING OVERLAY ═════════════════════════════════════════ */}
          <div className="overlay-wrap">
            <div className="overlay-inner">

              {/* LEFT panel — shown when in sign-up mode, prompts to sign in */}
              <div className="overlay-panel-inner overlay-left">
                <img src="/travel-icon.png" alt="Travel Buddy"
                  className="w-20 h-20 object-contain mb-5 drop-shadow-2xl"
                  style={{ animation:"glowRing 3s ease-in-out infinite", borderRadius:"50%" }} />
                <h2 className="text-2xl font-bold mb-3 tracking-tight" style={{ fontFamily:"'Cormorant Garamond',serif" }}>
                  Welcome Back!
                </h2>
                <p className="text-sm text-white/80 leading-relaxed mb-6 max-w-[200px]">
                  Already a traveler? Sign in to continue your adventures.
                </p>
                <OverlayButton onClick={() => { setError(""); setMode("login"); }} label="Sign In →" />
                <DemoCredential role="User" email="priya@example.com" pass="pass123" />
              </div>

              {/* RIGHT panel — shown when in sign-in mode, prompts to sign up */}
              <div className="overlay-panel-inner overlay-right">
                <img src="/travel-icon.png" alt="Travel Buddy"
                  className="w-20 h-20 object-contain mb-5 drop-shadow-2xl"
                  style={{ animation:"glowRing 3s ease-in-out infinite 1s", borderRadius:"50%" }} />
                <h2 className="text-2xl font-bold mb-3 tracking-tight" style={{ fontFamily:"'Cormorant Garamond',serif" }}>
                  Hello, Explorer!
                </h2>
                <p className="text-sm text-white/80 leading-relaxed mb-6 max-w-[200px]">
                  New here? Join thousands of solo travelers finding companions.
                </p>
                <OverlayButton onClick={() => { setError(""); setMode("signup"); }} label="Sign Up →" />
                <DemoCredential role="Admin" email="admin@travelbuddy.com" pass="Admin@123" />
              </div>

            </div>
          </div>

        </div>

        {/* ── Logo below the card ───────────────────────────────────── */}
        <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 transition-all duration-700
          ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <img src="/travel-logo.png" alt="Travel Buddy"
            className="h-7 w-auto object-contain opacity-40 hover:opacity-70 transition-opacity" />
        </div>

      </div>
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

// Form panel wrapper (used for both sign-in and sign-up)
function FormPanel({ title, subtitle, children, error, loading, onSubmit, submitLabel }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 sm:px-12 py-10"
      style={{ minHeight: 520 }}>

      {/* Logo mark */}
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
        style={{ background:"linear-gradient(135deg,#1a3d2b,#2a5c40)" }}>
        <span className="text-amber-400 text-lg font-black">✦</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-0.5 tracking-tight"
        style={{ fontFamily:"'Cormorant Garamond',serif" }}>
        {title}
      </h1>
      <p className="text-xs text-gray-400 mb-5 tracking-wide">{subtitle}</p>

      {/* Error */}
      {error && (
        <div className="w-full mb-3 px-4 py-2.5 rounded-xl text-xs text-red-700
                        bg-red-50 border border-red-200 flex items-center gap-2">
          <span>⚠️</span>{error}
        </div>
      )}

      {/* Fields */}
      <div className="w-full space-y-3">
        {children}
      </div>

      {/* Submit button */}
      <button
        className="auth-btn mt-5 w-full py-3 rounded-2xl text-sm font-black uppercase tracking-widest
                   text-white relative overflow-hidden transition-all duration-200"
        style={{
          background: loading
            ? "#9cbc9e"
            : "linear-gradient(135deg, #1a3d2b 0%, #2a5c40 50%, #c9640a 100%)",
          backgroundSize: "200% 100%",
          boxShadow: loading ? "none" : "0 4px 18px rgba(26,61,43,.4), 0 1px 4px rgba(201,100,10,.3)",
          letterSpacing:"0.1em",
        }}
        onClick={!loading ? onSubmit : undefined}
        disabled={loading}
        onMouseOver={e => !loading && (e.currentTarget.style.backgroundPosition="100% 0")}
        onMouseOut={e => !loading && (e.currentTarget.style.backgroundPosition="0% 0")}>
        {loading
          ? <span className="flex items-center justify-center gap-2">
              <svg className="spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.3)" strokeWidth="3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              Please wait…
            </span>
          : submitLabel
        }
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 mt-4 w-full">
        <div className="flex-1 h-px bg-gray-100"/>
        <span className="text-[10px] text-gray-300 uppercase tracking-widest font-bold">or</span>
        <div className="flex-1 h-px bg-gray-100"/>
      </div>

      {/* Social icons */}
      <div className="flex gap-3 mt-3">
        {[
          { bg:"#1877F2", icon:"f", label:"Facebook" },
          { bg:"#EA4335", icon:"G", label:"Google" },
          { bg:"#0A66C2", icon:"in",label:"LinkedIn" },
        ].map(s => (
          <button key={s.label}
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center
                       text-xs font-black text-white transition-all duration-200 cursor-pointer
                       hover:scale-110 hover:shadow-md"
            style={{ background: s.bg }}
            title={s.label}>
            {s.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

// Styled input with left icon
function AuthInput({ icon, type, placeholder, value, onChange, onKeyDown }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-sm transition-all duration-200
        ${focused || value ? "opacity-100" : "opacity-40"}`}>
        {icon}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="auth-input w-full pl-10 pr-4 py-3 rounded-2xl text-sm text-gray-700
                   transition-all duration-200 outline-none"
        style={{
          background: focused ? "#fff" : "#f4ede3",
          border: `1.5px solid ${focused ? "#f97316" : "transparent"}`,
          boxShadow: focused
            ? "0 0 0 3px rgba(249,115,22,.15)"
            : "inset 0 1px 3px rgba(0,0,0,.05)",
        }}
      />
    </div>
  );
}

// Overlay ghost button
function OverlayButton({ onClick, label }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="auth-btn px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest
                 border-2 border-white/80 transition-all duration-300 cursor-pointer"
      style={{
        background: hovered ? "rgba(255,255,255,.2)" : "transparent",
        color: "#fff",
        boxShadow: hovered ? "0 0 18px rgba(255,255,255,.25)" : "none",
        transform: hovered ? "translateY(-2px)" : "none",
      }}>
      {label}
    </button>
  );
}

// Demo credential chip shown on overlay
function DemoCredential({ role, email, pass }) {
  return (
    <div className="mt-5 px-3 py-2 rounded-xl text-[10px] text-white/60 leading-relaxed text-center"
      style={{ background:"rgba(0,0,0,.2)", backdropFilter:"blur(4px)" }}>
      <span className="font-black text-white/80 uppercase tracking-widest">{role}:</span>
      <br/>{email}
      <br/><span className="text-white/50">pw:</span> {pass}
    </div>
  );
}
