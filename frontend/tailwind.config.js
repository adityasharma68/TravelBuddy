// tailwind.config.js
// Custom design system for Travel Buddy
// Forest green (#1a3d2b) + Amber (#c9640a) + Warm cream (#f4ede3)

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      height: {
        "18": "4.5rem",   // custom header height between h-16 and h-20
      },
      colors: {
        forest: {
          50:  "#f0f7f3",
          100: "#dceddf",
          200: "#bbdac0",
          300: "#8ec09a",
          400: "#5fa170",
          500: "#3d8353",
          600: "#2a5c40",
          700: "#1a3d2b",  // ← primary brand color
          800: "#162f22",
          900: "#0e1e16",
        },
        amber: {
          50:  "#fff7ed",
          100: "#ffedd5",
          400: "#fb923c",
          500: "#f97316",
          600: "#c9640a",  // ← accent color
          700: "#a8520a",
        },
        cream: {
          DEFAULT: "#f4ede3",
          dark:    "#ece4d5",
        },
      },
      fontFamily: {
        serif: ["'Cormorant Garamond'", "Georgia", "serif"],
        sans:  ["'DM Sans'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 12px rgba(26,61,43,0.07), 0 1px 3px rgba(26,61,43,0.05)",
        lift: "0 8px 36px rgba(26,61,43,0.13), 0 2px 8px rgba(26,61,43,0.07)",
        modal:"0 24px 80px rgba(0,0,0,0.35)",
      },
      animation: {
        "slide-in":  "slideIn 0.28s cubic-bezier(0.22,1,0.36,1)",
        "fade-in":   "fadeIn 0.18s ease",
        "toast-in":  "toastIn 0.26s ease",
        "toast-out": "toastOut 0.3s 2.7s ease forwards",
        "bounce-dot":"bounceDot 1.2s infinite",
        "spin":      "spin 0.7s linear infinite",
      },
      keyframes: {
        slideIn:   { from:{ transform:"translateX(100%)" }, to:{ transform:"translateX(0)" } },
        fadeIn:    { from:{ opacity:0 }, to:{ opacity:1 } },
        toastIn:   { from:{ opacity:0, transform:"translateX(-50%) translateY(1rem)" }, to:{ opacity:1, transform:"translateX(-50%) translateY(0)" } },
        toastOut:  { to:{ opacity:0, transform:"translateX(-50%) translateY(-0.5rem)" } },
        bounceDot: { "0%,60%,100%":{ transform:"translateY(0)" }, "30%":{ transform:"translateY(-6px)" } },
        spin:      { to:{ transform:"rotate(360deg)" } },
      },
    },
  },
  plugins: [],
};
