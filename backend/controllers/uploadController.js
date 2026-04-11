// controllers/uploadController.js
// ─────────────────────────────────────────────────────────────────────────────
//  Upload Controller — Handles Cloudinary image uploads (Feature 2)
//
//  Endpoints:
//    POST /api/upload/avatar     → uploads profile picture, updates user record
//    POST /api/upload/trip-image → uploads a trip/post image
//    DELETE /api/upload/avatar   → removes profile picture
//
//  How it works:
//    1. Client sends multipart/form-data with field name "image"
//    2. Multer parses the file, CloudinaryStorage uploads it automatically
//    3. req.file.path contains the Cloudinary secure URL
//    4. We save that URL to the database and return it
// ─────────────────────────────────────────────────────────────────────────────

const { cloudinary } = require("../config/cloudinary");
const UserModel      = require("../models/userModel");

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/upload/avatar
//  Multipart field: "image" (single file)
// ─────────────────────────────────────────────────────────────────────────────
const uploadAvatar = async (req, res) => {
  try {
    // multer + CloudinaryStorage already uploaded the file before this runs
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided." });
    }

    // req.file.path is the Cloudinary HTTPS URL
    const avatarUrl = req.file.path;

    // Delete the old avatar from Cloudinary if one exists
    const user = await UserModel.findById(req.user.id);
    if (user?.avatar_url) {
      // Extract public_id from the URL: "travel-buddy/avatars/abc123"
      const publicId = user.avatar_url
        .split("/upload/")[1]
        ?.replace(/\.[^/.]+$/, "") // remove extension
        ?.split("/v")[0];          // remove version prefix
      if (publicId) {
        await cloudinary.uploader.destroy(publicId).catch(() => {}); // silent fail
      }
    }

    // Save new URL to database
    await UserModel.updateAvatar(req.user.id, avatarUrl);

    // Return fresh user data so frontend can update state
    const updatedUser = await UserModel.findById(req.user.id);
    res.json({ avatarUrl, user: updatedUser });
  } catch (err) {
    console.error("Avatar upload error:", err);
    res.status(500).json({ error: "Image upload failed. Please try again." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/upload/trip-image
//  Multipart field: "image" (single file)
//  Returns the Cloudinary URL — caller stores it wherever needed.
// ─────────────────────────────────────────────────────────────────────────────
const uploadTripImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided." });
    }
    res.json({ imageUrl: req.file.path });
  } catch (err) {
    console.error("Trip image upload error:", err);
    res.status(500).json({ error: "Image upload failed. Please try again." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE /api/upload/avatar
//  Removes profile picture from Cloudinary and clears the DB field.
// ─────────────────────────────────────────────────────────────────────────────
const deleteAvatar = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (user?.avatar_url) {
      const parts   = user.avatar_url.split("/upload/")[1] || "";
      const publicId = parts.replace(/\.[^/.]+$/, "").replace(/^v\d+\//, "");
      await cloudinary.uploader.destroy(publicId).catch(() => {});
    }
    await UserModel.updateAvatar(req.user.id, null);
    res.json({ message: "Profile picture removed." });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove picture." });
  }
};

module.exports = { uploadAvatar, uploadTripImage, deleteAvatar };
