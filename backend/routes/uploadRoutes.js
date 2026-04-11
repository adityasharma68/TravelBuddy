// routes/uploadRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
//  Upload Routes — /api/upload
//
//  All routes are protected (JWT required).
//  Multer middleware parses the multipart/form-data before the controller runs.
//  The file is uploaded to Cloudinary automatically by multer-storage-cloudinary.
//
//  POST /api/upload/avatar      → upload / replace profile picture
//  POST /api/upload/trip-image  → upload an image for a trip post
//  DELETE /api/upload/avatar    → remove profile picture
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const { protect }  = require("../middleware/authMiddleware");
const { uploadAvatar: uploadAvatarMW, uploadTripImage: uploadTripMW } = require("../config/cloudinary");
const {
  uploadAvatar,
  uploadTripImage,
  deleteAvatar,
} = require("../controllers/uploadController");

const router = express.Router();

// All upload routes require authentication
router.use(protect);

// Single file, field name must be "image"
router.post  ("/avatar",      uploadAvatarMW.single("image"),  uploadAvatar);
router.post  ("/trip-image",  uploadTripMW.single("image"),    uploadTripImage);
router.delete("/avatar",                                        deleteAvatar);

module.exports = router;
