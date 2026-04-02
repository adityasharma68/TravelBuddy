// src/components/Modal.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  Modal — Reusable overlay dialog component
//
//  Props:
//    open     {boolean}  — controls visibility
//    onClose  {function} — called when backdrop or X is clicked
//    title    {string}   — header text
//    children            — dialog body content
//    maxWidth {string}   — Tailwind width class (default "max-w-lg")
// ─────────────────────────────────────────────────────────────────────────────

export default function Modal({ open, onClose, title, children, maxWidth = "max-w-lg" }) {
  if (!open) return null;

  return (
    // Dark backdrop — clicking it closes the modal
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(0,0,0,0.38)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>

      {/* Dialog box */}
      <div className={`bg-white rounded-2xl p-7 w-full ${maxWidth} shadow-lift max-h-[90vh] overflow-y-auto`}>
        {/* Header row */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-xl font-semibold text-forest-700">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full
                       border border-gray-200 text-gray-400 hover:text-gray-600
                       hover:bg-gray-50 transition-all text-sm cursor-pointer bg-white border-none">
            ✕
          </button>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
