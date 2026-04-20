// src/pages/AuthPage.jsx
import { useState, useEffect } from "react";
import { GoogleLogin }         from "@react-oauth/google";
import { useAuth }             from "../context/AuthContext";
import {
  loginUser, registerUser, googleLogin,
  forgotPassword, resetPassword,
} from "../services/authService";

// ── Forgot Password Modal ─────────────────────────────────────────────────────
function ForgotPasswordModal({ onClose, showToast }) {
  const [step, setStep]           = useState(1);
  const [email, setEmail]         = useState("");
  const [otp, setOtp]             = useState("");
  const [newPass, setNewPass]     = useState("");
  const [confirmPass, setConfirm] = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const handleSendOtp = async () => {
    if (!email.trim()) { setError("Please enter your email."); return; }
    setError(""); setLoading(true);
    try {
      await forgotPassword({ email: email.trim() });
      showToast("Reset code sent! Check your inbox 📬");
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send email.");
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = () => {
    if (!otp.trim() || otp.length !== 6) { setError("Enter the 6-digit code from your email."); return; }
    setError(""); setStep(3);
  };

  const handleResetPassword = async () => {
    if (!newPass || newPass.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (newPass !== confirmPass) { setError("Passwords do not match."); return; }
    setError(""); setLoading(true);
    try {
      await resetPassword({ email: email.trim(), otp: otp.trim(), newPassword: newPass });
      showToast("Password reset! You can now log in 🎉");
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Reset failed. Try requesting a new code.");
      setStep(1);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4"
      style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800" style={{ fontFamily:"'Cormorant Garamond',serif" }}>
              Reset Password
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Step {step} of 3</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500
                       flex items-center justify-center text-sm cursor-pointer border-none">✕</button>
        </div>

        <div className="flex gap-2 mb-6">
          {[1,2,3].map(s => (
            <div key={s} className="flex-1 h-1.5 rounded-full transition-all duration-300"
              style={{ background: s <= step ? "#1a3d2b" : "#e5e7eb" }} />
          ))}
        </div>

        {error && (
          <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
            <span>⚠️</span>{error}
          </div>
        )}

        {step === 1 && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Email Address</label>
            <input type="email" className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-forest-700 focus:bg-white transition-all mb-5"
              placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSendOtp()} />
            <button onClick={handleSendOtp} disabled={loading}
              className="w-full py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest text-white cursor-pointer border-none disabled:opacity-60"
              style={{ background:"linear-gradient(135deg,#1a3d2b,#2a5c40)" }}>
              {loading ? "Sending…" : "Send Reset Code →"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-sm text-gray-500 mb-4">We sent a 6-digit code to <strong>{email}</strong>.</p>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">6-Digit Code</label>
            <input type="text" maxLength={6} inputMode="numeric"
              className="w-full px-4 py-4 rounded-2xl border border-gray-200 bg-gray-50 text-center text-3xl font-black tracking-[0.4em] outline-none focus:border-forest-700 focus:bg-white transition-all mb-5"
              placeholder="______" value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g,""))}
              onKeyDown={e => e.key === "Enter" && handleVerifyOtp()} />
            <button onClick={handleVerifyOtp}
              className="w-full py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest text-white border-none cursor-pointer"
              style={{ background:"linear-gradient(135deg,#1a3d2b,#2a5c40)" }}>
              Verify Code →
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">New Password</label>
            <input type="password" className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-forest-700 focus:bg-white transition-all mb-3"
              placeholder="At least 6 characters" value={newPass} onChange={e => setNewPass(e.target.value)} />
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Confirm Password</label>
            <input type="password" className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-forest-700 focus:bg-white transition-all mb-2"
              placeholder="Repeat new password" value={confirmPass} onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleResetPassword()} />
            {confirmPass && <p className={`text-xs mb-3 font-semibold ${newPass === confirmPass ? "text-green-600" : "text-red-500"}`}>
              {newPass === confirmPass ? "✓ Passwords match" : "✗ Passwords don't match"}
            </p>}
            <button onClick={handleResetPassword} disabled={loading}
              className="w-full py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest text-white border-none cursor-pointer disabled:opacity-60"
              style={{ background:"linear-gradient(135deg,#1a3d2b,#c9640a)" }}>
              {loading ? "Resetting…" : "Set New Password ✓"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main AuthPage ─────────────────────────────────────────────────────────────
export default function AuthPage({ showToast }) {
  const { loginCtx }               = useAuth();
  const [mode, setMode]            = useState("login");
  const [loading, setLoading]      = useState(false);
  const [googleLoading, setGLoad]  = useState(false);
  const [error, setError]          = useState("");
  const [mounted, setMounted]      = useState(false);
  const [showForgot, setShowForgot]= useState(false);
  const [loginForm, setLoginForm]  = useState({ email:"", password:"" });
  const [signupForm, setSignupForm]= useState({ name:"", email:"", password:"", age:"", bio:"" });

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const setL = (k) => (e) => setLoginForm(f  => ({ ...f, [k]: e.target.value }));
  const setS = (k) => (e) => setSignupForm(f => ({ ...f, [k]: e.target.value }));

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
    if (!signupForm.name || !signupForm.email || !signupForm.password) {
      setError("Name, email and password are required."); return;
    }
    if (signupForm.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setError(""); setLoading(true);
    try {
      const { data } = await registerUser(signupForm);
      loginCtx(data.token, data.user);
      showToast(`Welcome to Travel Buddy, ${data.user.name.split(" ")[0]}! ✈️`);
    } catch (err) { setError(err.response?.data?.error || "Registration failed."); }
    finally { setLoading(false); }
  };

  // ── Google Sign-In — uses credential (ID token) flow, no popup ─────────────
  const handleGoogleSuccess = async (credentialResponse) => {
    setGLoad(true); setError("");
    try {
      const { data } = await googleLogin({ credential: credentialResponse.credential });
      loginCtx(data.token, data.user);
      showToast(`Welcome, ${data.user.name.split(" ")[0]}! 🌍`);
    } catch (err) {
      setError(err.response?.data?.error || "Google sign-in failed. Please try again.");
    } finally { setGLoad(false); }
  };

  const handleGoogleError = () => {
    setError("Google sign-in was cancelled or failed.");
    setGLoad(false);
  };

  const isSignUp = mode === "signup";

  return (
    <>
      <style>{`
        @keyframes floatUp   { 0%,100%{transform:translateY(0);opacity:.7}  50%{transform:translateY(-20px);opacity:1} }
        @keyframes floatSide { 0%,100%{transform:translateX(0);opacity:.5}  50%{transform:translateX(12px);opacity:.9} }
        @keyframes pulse     { 0%,100%{transform:scale(1);opacity:.4}        50%{transform:scale(1.15);opacity:.8} }
        @keyframes shimmerBg { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes containerIn { from{opacity:0;transform:scale(.95) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes fieldIn   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes iconPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .spin-svg { animation:spin .7s linear infinite; }
        .f0{animation:fieldIn .38s .05s both} .f1{animation:fieldIn .38s .10s both}
        .f2{animation:fieldIn .38s .16s both} .f3{animation:fieldIn .38s .22s both}
        .f4{animation:fieldIn .38s .28s both}
        .auth-wrap { animation:containerIn .55s cubic-bezier(.22,1,.36,1) forwards; }
        .auth-container { position:relative; }
        .sign-in-panel {
          position:absolute; top:0; left:0; width:50%; height:100%;
          transition:transform .65s cubic-bezier(.77,0,.175,1); z-index:2; overflow-y:auto;
        }
        .auth-container.signup .sign-in-panel { transform:translateX(100%); }
        .sign-up-panel {
          position:absolute; top:0; left:0; width:50%; height:100%;
          opacity:0; z-index:1; overflow-y:auto;
          transition:transform .65s cubic-bezier(.77,0,.175,1), opacity .65s cubic-bezier(.77,0,.175,1);
        }
        .auth-container.signup .sign-up-panel { transform:translateX(100%); opacity:1; z-index:5; }
        .overlay-wrap {
          position:absolute; top:0; left:50%; width:50%; height:100%;
          z-index:100; overflow:hidden; transition:transform .65s cubic-bezier(.77,0,.175,1);
        }
        .auth-container.signup .overlay-wrap { transform:translateX(-100%); }
        .overlay-inner {
          position:relative; left:-100%; width:200%; height:100%;
          background:linear-gradient(135deg,#1a3d2b 0%,#2a5c40 30%,#c9640a 70%,#f97316 100%);
          background-size:200% 200%; animation:shimmerBg 8s ease infinite;
          transition:transform .65s cubic-bezier(.77,0,.175,1);
        }
        .auth-container.signup .overlay-inner { transform:translateX(50%); }
        .overlay-panel-inner {
          position:absolute; top:0; width:50%; height:100%;
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          padding:2rem; text-align:center; color:#fff;
          transition:transform .65s cubic-bezier(.77,0,.175,1);
        }
        .overlay-left  { transform:translateX(-15%); }
        .overlay-right { right:0; }
        .auth-container.signup .overlay-left  { transform:translateX(0); }
        .auth-container.signup .overlay-right { transform:translateX(15%); }
        .auth-input:focus { border-color:#f97316 !important; box-shadow:0 0 0 3px rgba(249,115,22,.18) !important; background:#fff !important; outline:none; }
        .auth-btn:active { transform:scale(.97); }
      `}</style>

      <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8"
        style={{ background:"linear-gradient(150deg,#050f08 0%,#0d2218 45%,#08180e 100%)" }}>

        {/* Glow orbs */}
        {[
          {w:500,h:500,top:"-120px",left:"-90px",c:"rgba(249,115,22,.10)"},
          {w:580,h:580,bottom:"-150px",right:"-80px",c:"rgba(14,165,233,.07)"},
          {w:340,h:340,top:"38%",left:"32%",c:"rgba(26,61,43,.40)"},
        ].map((o,i) => (
          <div key={i} className="absolute pointer-events-none rounded-full" style={{
            width:o.w,height:o.h,top:o.top,left:o.left,bottom:o.bottom,right:o.right,
            background:`radial-gradient(circle,${o.c} 0%,transparent 70%)`,
          }}/>
        ))}

        {/* Particles */}
        {[
          {s:6,x:"7%",y:"12%",c:"rgba(249,115,22,.55)",a:"floatUp 6.5s ease-in-out infinite"},
          {s:9,x:"20%",y:"72%",c:"rgba(14,165,233,.40)",a:"floatSide 8s ease-in-out infinite 1s"},
          {s:5,x:"84%",y:"18%",c:"rgba(249,115,22,.45)",a:"floatUp 7s ease-in-out infinite 2s"},
          {s:7,x:"78%",y:"78%",c:"rgba(255,255,255,.10)",a:"pulse 5s ease-in-out infinite .5s"},
          {s:4,x:"48%",y:"6%",c:"rgba(14,165,233,.25)",a:"floatSide 9s ease-in-out infinite 3s"},
          {s:10,x:"91%",y:"50%",c:"rgba(249,115,22,.18)",a:"floatUp 10s ease-in-out infinite 1.5s"},
        ].map((p,i) => (
          <div key={i} className="absolute rounded-full pointer-events-none" style={{
            width:p.s,height:p.s,left:p.x,top:p.y,background:p.c,animation:p.a,
          }}/>
        ))}

        {/* Main card */}
        <div className={`auth-wrap auth-container ${isSignUp?"signup":""} w-full relative`}
          style={{
            maxWidth:820, minHeight:520, borderRadius:24, overflow:"hidden",
            boxShadow:"0 28px 80px rgba(0,0,0,.55), 0 4px 20px rgba(0,0,0,.3)",
            opacity:mounted?1:0,
          }}>

          {/* Sign-In panel */}
          <div className="sign-in-panel" style={{background:"#fff",borderRadius:"inherit"}}>
            <FormPanel
              title="Sign In" subtitle="Welcome back, traveler!"
              error={!isSignUp?error:""} loading={loading&&!isSignUp}
              onSubmit={handleLogin} submitLabel="Sign In"
              onGoogleSuccess={handleGoogleSuccess}
              onGoogleError={handleGoogleError}
              googleLoading={googleLoading}
              forgotLink={
                <button type="button" onClick={() => setShowForgot(true)}
                  className="text-xs text-gray-400 hover:text-amber-600 transition-colors
                             mt-1 inline-block bg-transparent border-none cursor-pointer p-0">
                  Forgot your password?
                </button>
              }>
              <div className="f0">
                <AuthInput icon="✉" type="email" placeholder="Email address"
                  value={loginForm.email} onChange={setL("email")} />
              </div>
              <div className="f1">
                <AuthInput icon="🔒" type="password" placeholder="Password"
                  value={loginForm.password} onChange={setL("password")}
                  onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
              </div>
            </FormPanel>
          </div>

          {/* Sign-Up panel */}
          <div className="sign-up-panel" style={{background:"#fff",borderRadius:"inherit"}}>
            <FormPanel
              title="Create Account" subtitle="Start your adventure today"
              error={isSignUp?error:""} loading={loading&&isSignUp}
              onSubmit={handleSignup} submitLabel="Create Account"
              onGoogleSuccess={handleGoogleSuccess}
              onGoogleError={handleGoogleError}
              googleLoading={googleLoading}>
              <div className="f0"><AuthInput icon="👤" type="text" placeholder="Full name *" value={signupForm.name} onChange={setS("name")} /></div>
              <div className="f1"><AuthInput icon="✉" type="email" placeholder="Email address *" value={signupForm.email} onChange={setS("email")} /></div>
              <div className="f2"><AuthInput icon="🔒" type="password" placeholder="Password * (min 6 chars)" value={signupForm.password} onChange={setS("password")} /></div>
              <div className="f3"><AuthInput icon="🎂" type="number" placeholder="Age (optional)" value={signupForm.age} onChange={setS("age")} /></div>
              <div className="f4"><AuthInput icon="📝" type="text" placeholder="Bio (optional)" value={signupForm.bio} onChange={setS("bio")} /></div>
            </FormPanel>
          </div>

          {/* Overlay */}
          <div className="overlay-wrap">
            <div className="overlay-inner">
              <div className="overlay-panel-inner overlay-left">
                <img src="/travel-icon.png" alt="Travel Buddy" className="mb-5 object-contain"
                  style={{width:88,height:88,animation:"iconPulse 3s ease-in-out infinite"}} />
                <h2 className="text-2xl font-bold mb-2" style={{fontFamily:"'Cormorant Garamond',serif"}}>Welcome Back!</h2>
                <p className="text-sm text-white/75 leading-relaxed mb-7 max-w-[200px]">
                  Already a traveler? Sign in to continue your adventures.
                </p>
                <OverlayButton onClick={()=>{setError("");setMode("login");}} label="Sign In →" />
              </div>
              <div className="overlay-panel-inner overlay-right">
                <img src="/travel-icon.png" alt="Travel Buddy" className="mb-5 object-contain"
                  style={{width:88,height:88,animation:"iconPulse 3s ease-in-out infinite 1s"}} />
                <h2 className="text-2xl font-bold mb-2" style={{fontFamily:"'Cormorant Garamond',serif"}}>Hello, Explorer!</h2>
                <p className="text-sm text-white/75 leading-relaxed mb-7 max-w-[200px]">
                  New here? Join thousands of solo travelers finding companions.
                </p>
                <OverlayButton onClick={()=>{setError("");setMode("signup");}} label="Sign Up →" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom logo */}
        <div className={`absolute bottom-5 left-1/2 -translate-x-1/2 transition-all duration-700
          ${mounted?"opacity-100 translate-y-0":"opacity-0 translate-y-4"}`}>
          <img src="/travel-logo.png" alt="Travel Buddy"
            className="h-7 w-auto object-contain opacity-35 hover:opacity-60 transition-opacity" />
        </div>
      </div>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} showToast={showToast} />}
    </>
  );
}

// ── FormPanel ─────────────────────────────────────────────────────────────────
function FormPanel({ title, subtitle, children, error, loading, onSubmit, submitLabel,
                     onGoogleSuccess, onGoogleError, googleLoading, forgotLink }) {
  return (
    <div className="flex flex-col items-center justify-center px-8 sm:px-12 py-10">
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 shadow-lg shrink-0"
        style={{background:"linear-gradient(135deg,#1a3d2b,#2a5c40)"}}>
        <span className="text-amber-400 text-xl font-black">✦</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-0.5 tracking-tight"
        style={{fontFamily:"'Cormorant Garamond',serif"}}>{title}</h1>
      <p className="text-xs text-gray-400 mb-5 tracking-wide">{subtitle}</p>

      {error && (
        <div className="w-full mb-4 px-4 py-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-200 flex items-start gap-2">
          <span className="shrink-0 mt-0.5">⚠️</span><span>{error}</span>
        </div>
      )}

      <div className="w-full space-y-3 mb-2">{children}</div>
      {forgotLink && <div className="w-full text-right mb-3">{forgotLink}</div>}

      {/* Submit button */}
      <button type="button"
        className="auth-btn w-full py-4 rounded-2xl text-base font-black uppercase tracking-widest
                   text-white relative overflow-hidden transition-all duration-200
                   disabled:opacity-60 disabled:cursor-not-allowed mb-4"
        style={{
          background: loading ? "#9cbc9e" : "linear-gradient(135deg,#1a3d2b 0%,#2a5c40 45%,#c9640a 100%)",
          backgroundSize:"200% 100%",
          boxShadow: loading ? "none" : "0 6px 24px rgba(26,61,43,.45), 0 2px 8px rgba(201,100,10,.25)",
          letterSpacing:"0.12em",
        }}
        onClick={!loading ? onSubmit : undefined}
        disabled={loading}
        onMouseOver={e=>!loading&&(e.currentTarget.style.backgroundPosition="100% 0")}
        onMouseOut={e=>!loading&&(e.currentTarget.style.backgroundPosition="0% 0")}>
        {loading
          ? <span className="flex items-center justify-center gap-2.5">
              <svg className="spin-svg w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.3)" strokeWidth="3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>Please wait…
            </span>
          : submitLabel}
      </button>

      {/* Google Sign-In — uses credential flow (no popup, no COOP error) */}
      {googleLoading ? (
        <div className="w-full py-3 flex items-center justify-center gap-2 text-sm text-gray-500">
          <svg className="spin-svg w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#e2e8f0" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#1a3d2b" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          Connecting with Google…
        </div>
      ) : (
        <div className="w-full flex justify-center">
          <GoogleLogin
            onSuccess={onGoogleSuccess}
            onError={onGoogleError}
            width="100%"
            shape="rectangular"
            theme="outline"
            text="continue_with"
            useOneTap={false}
          />
        </div>
      )}

      <div className="flex items-center gap-3 my-3 w-full">
        <div className="flex-1 h-px bg-gray-100"/>
        <span className="text-[10px] text-gray-300 uppercase tracking-widest font-bold">or</span>
        <div className="flex-1 h-px bg-gray-100"/>
      </div>

      <div className="flex gap-3">
        {[
          {bg:"#1877F2",icon:"f",label:"Facebook"},
          {bg:"#EA4335",icon:"G",label:"Google"},
          {bg:"#0A66C2",icon:"in",label:"LinkedIn"},
        ].map(s => (
          <button key={s.label}
            className="w-11 h-11 rounded-full flex items-center justify-center text-sm
                       font-black text-white transition-all duration-200 cursor-pointer
                       hover:scale-110 hover:shadow-md border-none"
            style={{background:s.bg}} title={s.label}>{s.icon}</button>
        ))}
      </div>
    </div>
  );
}

function AuthInput({ icon, type, placeholder, value, onChange, onKeyDown }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none
                        transition-opacity duration-150 ${focused||value?"opacity-100":"opacity-40"}`}>
        {icon}
      </span>
      <input type={type} placeholder={placeholder} value={value}
        onChange={onChange} onKeyDown={onKeyDown}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        className="auth-input w-full pl-10 pr-4 py-3 rounded-2xl text-sm text-gray-700 transition-all duration-200"
        style={{
          background:focused?"#fff":"#f4ede3",
          border:`1.5px solid ${focused?"#f97316":"transparent"}`,
          boxShadow:focused?"0 0 0 3px rgba(249,115,22,.15)":"inset 0 1px 3px rgba(0,0,0,.05)",
        }}/>
    </div>
  );
}

function OverlayButton({ onClick, label }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      className="auth-btn px-9 py-3 rounded-full text-sm font-black uppercase tracking-widest
                 border-2 border-white/75 transition-all duration-250 cursor-pointer"
      style={{
        background:hovered?"rgba(255,255,255,.22)":"transparent", color:"#fff",
        boxShadow:hovered?"0 0 20px rgba(255,255,255,.22)":"none",
        transform:hovered?"translateY(-2px)":"none",
      }}>{label}</button>
  );
}
