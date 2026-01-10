const router = require("express").Router();
const {
  saveUser,
  getUserRole,
  getAllUsers, 
   checkUserEmail, 
} = require("../controllers/user.controller");

/* =====================
   USER ROUTES
===================== */
router.post("/users/check-email", checkUserEmail); // ✅ NEW
// Get all users ✅
router.get("/users", getAllUsers);

// Save user (if not exists)
router.post("/users/:email", saveUser);

// Get user role (admin / customer)
router.get("/users/role/:email", getUserRole);

module.exports = router;
