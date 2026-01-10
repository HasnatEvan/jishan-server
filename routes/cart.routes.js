const router = require("express").Router();
const {
  addToCart,
  getCartByEmail,
  updateCartQuantity,
  deleteCartItem,
} = require("../controllers/cart.controller");

/* =====================
   CART ROUTES
===================== */

// Add product to cart
router.post("/carts", addToCart);

// Get cart items by user email
router.get("/carts", getCartByEmail);

// Update cart product quantity
router.patch("/carts/:id", updateCartQuantity);

// Delete cart item
router.delete("/carts/:id", deleteCartItem);

module.exports = router;
