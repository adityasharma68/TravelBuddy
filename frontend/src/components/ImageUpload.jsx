// src/components/ImageUpload.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  ImageUpload — Reusable drag-and-drop / click-to-upload image component
//
//  Features:
//    • Click to open file picker
//    • Drag & drop support
//    • Instant preview before upload (FileReader API — no server roundtrip)
//    • File size + type validation before sending
//    • Upload progress state
//    • Success/error feedback
//
//  Props:
//    onUpload   {function}  — called with the Cloudinary URL after upload
//    uploadFn   {function}  — the service function to call (uploadAvatar / uploadTripImage)
//    current    {string}    — existing image URL to display as initial preview
//    label      {string}    — displayed above the dropzone
//    shape      {string}    — "circle" (avatar) | "rect" (trip image)
//    maxSizeMb  {number}    — max file size in MB (default 5)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from "react";

const ALLOWED_TYPES = ["image/jpeg","image/jpg","image/png","image/webp","image/gif"];

export default function ImageUpload({
  onUpload,
  uploadFn,
  current    = null,
  label      = "Upload Image",
  shape      = "rect",
  maxSizeMb  = 5,
}) {
  const [preview,    setPreview]    = useState(current || null);
  const [uploading,  setUploading]  = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [error,      setError]      = useState("");
  const [dragOver,   setDragOver]   = useState(false);
  const inputRef = useRef(null);

  // ── Validate + preview + upload ──────────────────────────────────────────
  const processFile = useCallback(async (file) => {
    setError("");

    // Type check
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPG, PNG, WebP, and GIF files are allowed.");
      return;
    }

    // Size check
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File too large. Maximum size is ${maxSizeMb} MB.`);
      return;
    }

    // Instant preview using FileReader (no upload needed for this)
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    // Build FormData and upload
    const formData = new FormData();
    formData.append("image", file);

    setUploading(true);
    setProgress(10); // immediate feedback

    // Fake progress steps while Cloudinary processes
    const progressTimer = setInterval(() => {
      setProgress(p => (p < 85 ? p + 15 : p));
    }, 400);

    try {
      const { data } = await uploadFn(formData);
      clearInterval(progressTimer);
      setProgress(100);

      // Extract the URL from whichever field the endpoint returns
      const url = data.avatarUrl || data.imageUrl;
      onUpload?.(url, data);

      setTimeout(() => setProgress(0), 600);
    } catch (err) {
      clearInterval(progressTimer);
      setProgress(0);
      setPreview(current || null); // revert preview on error
      setError(err.response?.data?.error || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [uploadFn, onUpload, current, maxSizeMb]);

  // ── Event handlers ────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = ""; // reset input so same file can be re-selected
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const isCircle = shape === "circle";

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
          {label}
        </label>
      )}

      {/* Dropzone */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative transition-all duration-200 cursor-pointer
                    border-2 border-dashed overflow-hidden group
                    ${isCircle ? "rounded-full" : "rounded-2xl"}
                    ${uploading ? "cursor-wait" : "cursor-pointer hover:border-forest-600"}
                    ${dragOver
                      ? "border-forest-600 bg-forest-50 scale-[1.02]"
                      : "border-gray-300 bg-gray-50"}`}
        style={isCircle
          ? { width:120, height:120 }
          : { width:"100%", aspectRatio:"16/9", maxHeight:200 }}>

        {/* Preview image */}
        {preview ? (
          <img src={preview} alt="Preview"
            className="w-full h-full object-cover" />
        ) : (
          /* Empty state */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center
                            text-gray-400 text-xl group-hover:bg-forest-100
                            group-hover:text-forest-700 transition-colors">
              📷
            </div>
            {!isCircle && (
              <>
                <p className="text-xs font-semibold text-gray-500 text-center">
                  Drop image here or click to browse
                </p>
                <p className="text-[10px] text-gray-400">
                  JPG, PNG, WebP · max {maxSizeMb}MB
                </p>
              </>
            )}
          </div>
        )}

        {/* Hover overlay — always shown on hover when there's a preview */}
        {preview && !uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1
                          opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background:"rgba(26,61,43,0.6)" }}>
            <span className="text-2xl">📷</span>
            <span className="text-white text-xs font-bold">
              {isCircle ? "Change" : "Replace image"}
            </span>
          </div>
        )}

        {/* Upload progress bar */}
        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background:"rgba(255,255,255,0.88)" }}>
            <div className="w-8 h-8 border-3 border-gray-200 border-t-forest-700
                            rounded-full"
              style={{ animation:"spin .6s linear infinite",
                       borderWidth:3, borderStyle:"solid",
                       borderColor:"#e5e7eb #e5e7eb #e5e7eb #1a3d2b" }} />
            <p className="text-xs font-bold text-forest-700">
              Uploading… {progress}%
            </p>
            {/* Progress bar */}
            <div className="w-3/4 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-forest-700 rounded-full transition-all duration-300"
                style={{ width:`${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
          <span>⚠️</span>{error}
        </p>
      )}

      {/* Success message */}
      {progress === 100 && !error && (
        <p className="mt-2 text-xs text-green-600 font-semibold flex items-center gap-1.5">
          ✓ Image uploaded successfully
        </p>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="hidden"
        onChange={handleFileChange}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
