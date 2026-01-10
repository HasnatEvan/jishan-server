const router = require("express").Router();
const {
  sendOtp,
  verifyOtp,
} = require("../controllers/otp.controller");

/* =====================
   OTP ROUTES
===================== */

// Send OTP to email
router.post("/send-otp", sendOtp);

// Verify OTP
router.post("/verify-otp", verifyOtp);

module.exports = router;
