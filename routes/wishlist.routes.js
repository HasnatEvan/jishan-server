const router = require("express").Router();
const {
  addToWishlist,
  getWishlistByEmail,
  deleteWishlistItem,
} = require("../controllers/wishlist.controller");

/* =====================
   WISHLIST ROUTES
===================== */

// Add product to wishlist
router.post("/wishlists", addToWishlist);

// Get wishlist by user email
router.get("/wishlists", getWishlistByEmail);

// Delete wishlist item
router.delete("/wishlists", deleteWishlistItem);

module.exports = router;
