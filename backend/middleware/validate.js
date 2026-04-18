// middleware/validate.js
// ─────────────────────────────────────────────────────────────────────────────
//  Request Validation Middleware — express-validator
//
//  express-validator lets us declare validation rules as arrays of checks
//  and attach them to routes BEFORE the controller runs.
//
//  Usage in a route file:
//    const { validateRegister } = require("../middleware/validate");
//    router.post("/register", validateRegister, register);
//
//  If any check fails, handleValidation() returns 422 with all error messages
//  before the controller is ever called — clean separation of concerns.
// ─────────────────────────────────────────────────────────────────────────────

const { body, validationResult } = require("express-validator");

// ── Collect validation errors and return 422 if any exist ────────────────────
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return the first error message for simplicity
    const first = errors.array()[0];
    return res.status(422).json({ error: first.msg });
  }
  next();
};

// ── Register: name + email + password ────────────────────────────────────────
const validateRegister = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required.")
    .isLength({ min: 2, max: 100 }).withMessage("Name must be 2–100 characters."),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required.")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters.")
    .isLength({ max: 128 }).withMessage("Password is too long."),

  body("age")
    .optional()
    .isInt({ min: 13, max: 120 }).withMessage("Age must be between 13 and 120."),

  handleValidation,
];

// ── Login: email + password only ─────────────────────────────────────────────
const validateLogin = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Invalid email address.")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required."),

  handleValidation,
];

// ── Forgot Password: just email ───────────────────────────────────────────────
const validateForgotPassword = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Invalid email address.")
    .normalizeEmail(),

  handleValidation,
];

// ── Reset Password: email + OTP + newPassword ────────────────────────────────
const validateResetPassword = [
  body("email")
    .trim().isEmail().withMessage("Invalid email address.").normalizeEmail(),

  body("otp")
    .trim()
    .notEmpty().withMessage("Reset code is required.")
    .isLength({ min: 6, max: 6 }).withMessage("Code must be 6 digits.")
    .isNumeric().withMessage("Code must contain only digits."),

  body("newPassword")
    .notEmpty().withMessage("New password is required.")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),

  handleValidation,
];

// ── Create / Update Trip ──────────────────────────────────────────────────────
const validateTrip = [
  body("destination")
    .trim()
    .notEmpty().withMessage("Destination is required.")
    .isLength({ max: 100 }).withMessage("Destination name is too long."),

  body("country")
    .trim()
    .notEmpty().withMessage("Country is required."),

  body("dates")
    .trim()
    .notEmpty().withMessage("Travel dates are required."),

  body("spots")
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage("Spots must be between 1 and 50."),

  handleValidation,
];

// ── Update Profile ────────────────────────────────────────────────────────────
const validateProfile = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required.")
    .isLength({ min: 2, max: 100 }).withMessage("Name must be 2–100 characters."),

  body("age")
    .optional()
    .isInt({ min: 13, max: 120 }).withMessage("Age must be between 13 and 120."),

  body("bio")
    .optional()
    .isLength({ max: 500 }).withMessage("Bio must be under 500 characters."),

  handleValidation,
];

// ── Change Password ───────────────────────────────────────────────────────────
const validateChangePassword = [
  body("currentPassword")
    .notEmpty().withMessage("Current password is required."),

  body("newPassword")
    .notEmpty().withMessage("New password is required.")
    .isLength({ min: 6 }).withMessage("New password must be at least 6 characters.")
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error("New password must be different from your current password.");
      }
      return true;
    }),

  handleValidation,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateTrip,
  validateProfile,
  validateChangePassword,
};
