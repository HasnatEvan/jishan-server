const router = require("express").Router();
const verifyToken = require("../middlewares/verifyToken");

const {
  placeOrder,
  getAllOrders,
  getCustomerOrders,
  deleteOrder,
  updateOrderStatus,
} = require("../controllers/order.controller");

/* =====================
   ORDER ROUTES
===================== */

// Place new order (customer)
router.post("/orders", verifyToken, placeOrder);

// Get all orders (admin)
router.get("/orders", verifyToken, getAllOrders);

// Get orders by customer email
router.get("/customer-orders/:email", getCustomerOrders);

// Delete order & restore stock (admin)
router.delete("/orders/:id", verifyToken, deleteOrder);

// Update order status (admin)
router.patch("/orders/:id", verifyToken, updateOrderStatus);

module.exports = router;
