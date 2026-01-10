const router = require("express").Router();
const {
  generateJWT,
  logout,
} = require("../controllers/auth.controller");

/* =====================
   AUTH ROUTES
===================== */

// Generate JWT & set cookie
router.post("/jwt", generateJWT);

// Clear cookie (Logout)
router.get("/logout", logout);

module.exports = router;
