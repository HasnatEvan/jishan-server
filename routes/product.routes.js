const router = require("express").Router();
const verifyToken = require("../middlewares/verifyToken");

const {
  addProduct,
  getAllProductsRandom,
  searchProducts,
  getProducts,
  getSingleProduct,
  getCategories,
  getPopularCategories,
  updateProduct,
  deleteProduct,
} = require("../controllers/product.controller");

/* =====================
   PRODUCT ROUTES
===================== */

// Add product
router.post("/products", verifyToken, addProduct);

// Get random products
router.get("/all-products", getAllProductsRandom);

// Search products
router.get("/products/search", searchProducts);

// Get products (all / category wise)
router.get("/products", getProducts);

// Get single product
router.get("/products/:id", getSingleProduct);

// Get categories
router.get("/categories", getCategories);

// Get popular categories
router.get("/popular-categories", getPopularCategories);

// Update product
router.put("/products/:id", verifyToken, updateProduct);

// Delete product
router.delete("/products/:id", verifyToken, deleteProduct);

module.exports = router;
