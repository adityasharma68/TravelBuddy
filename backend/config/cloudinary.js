// config/cloudinary.js
// ─────────────────────────────────────────────────────────────────────────────
//  Cloudinary Configuration
//
//  Cloudinary is a cloud service for storing, transforming, and serving images.
//  We configure it once here and export the configured instance.
//  The multer-storage-cloudinary package connects multer (file parsing) with
//  Cloudinary (cloud storage) so files go directly to the cloud — never saved
//  to the local disk.
//
//  Free tier: 25GB storage + 25GB bandwidth/month — plenty for development.
//  Sign up at: https://cloudinary.com
// ─────────────────────────────────────────────────────────────────────────────

const cloudinary        = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer            = require("multer");

// ── Configure Cloudinary with credentials from .env ──────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Storage engine for Profile Avatars ───────────────────────────────────────
// Files land in the "travel-buddy/avatars" folder in your Cloudinary account.
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         "travel-buddy/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    transformation:  [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
    // Square crop centred on faces — perfect for profile pictures
  },
});

// ── Storage engine for Trip / Post Images ────────────────────────────────────
const tripImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          "travel-buddy/trips",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation:  [{ width: 1200, height: 675, crop: "fill" }],
    // 16:9 crop — matches the trip card visual header dimensions
  },
});

// ── Multer middleware instances ───────────────────────────────────────────────
// These are used directly in route definitions:
//   router.post("/avatar", uploadAvatar.single("image"), ...)
const uploadAvatar    = multer({ storage: avatarStorage,    limits: { fileSize: 5 * 1024 * 1024 } }); // 5 MB max
const uploadTripImage = multer({ storage: tripImageStorage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB max

module.exports = { cloudinary, uploadAvatar, uploadTripImage };
