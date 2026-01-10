const { ObjectId } = require("mongodb");
const client = require("../config/db");

/* =====================
   COLLECTION
===================== */
const productCollection = client
  .db("e_cormmerce")
  .collection("products");

/* =====================
   ADD PRODUCT
===================== */
exports.addProduct = async (req, res) => {
  try {
    const product = req.body;

    // 🇧🇩 Bangladesh time
    const bdTime = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Dhaka",
    });

    const result = await productCollection.insertOne({
      ...product,
      createdAt: bdTime,
    });

    res.status(201).send(result);
  } catch (error) {
    console.error("Add product error:", error);
    res.status(500).send({ message: "Failed to add product" });
  }
};

/* =====================
   GET ALL PRODUCTS (RANDOM)
===================== */
exports.getAllProductsRandom = async (req, res) => {
  const result = await productCollection
    .aggregate([{ $sample: { size: 100 } }])
    .toArray();

  res.send(result);
};

/* =====================
   SEARCH PRODUCTS
===================== */
exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) return res.send([]);

    const result = await productCollection
      .find({ name: { $regex: q, $options: "i" } })
      .sort({ _id: -1 })
      .toArray();

    res.send(result);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).send({ message: "Search failed" });
  }
};

/* =====================
   GET PRODUCTS (ALL / CATEGORY)
===================== */
exports.getProducts = async (req, res) => {
  const { category } = req.query;

  const query = category
    ? { category: { $regex: `^${category}$`, $options: "i" } }
    : {};

  const result = await productCollection
    .find(query)
    .sort({ _id: -1 })
    .toArray();

  res.send(result);
};

/* =====================
   GET SINGLE PRODUCT
===================== */
exports.getSingleProduct = async (req, res) => {
  try {
    const id = req.params.id;

    const result = await productCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!result) {
      return res.status(404).send({ message: "Product not found" });
    }

    res.send(result);
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).send({ message: "Failed to load product" });
  }
};

/* =====================
   GET CATEGORIES
===================== */
exports.getCategories = async (req, res) => {
  try {
    const categories = await productCollection
      .aggregate([
        {
          $group: {
            _id: "$category",
            categoryImage: { $first: "$categoryImage" },
          },
        },
        {
          $project: {
            _id: 0,
            name: "$_id",
            image: "$categoryImage",
          },
        },
      ])
      .toArray();

    res.send(categories);
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).send({ message: "Failed to load categories" });
  }
};

/* =====================
   GET POPULAR CATEGORIES
===================== */
exports.getPopularCategories = async (req, res) => {
  try {
    const categories = await productCollection
      .aggregate([
        {
          $group: {
            _id: "$category",
            categoryImage: { $first: "$categoryImage" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            category: "$_id",
            categoryImage: 1,
            count: 1,
          },
        },
      ])
      .toArray();

    res.send(categories);
  } catch (error) {
    console.error("Popular categories error:", error);
    res.status(500).send({ message: "Failed to load popular categories" });
  }
};

/* =====================
   UPDATE PRODUCT
===================== */
exports.updateProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const updatedProduct = req.body;

    const result = await productCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedProduct }
    );

    res.send(result);
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).send({ message: "Failed to update product" });
  }
};

/* =====================
   DELETE PRODUCT
===================== */
exports.deleteProduct = async (req, res) => {
  try {
    const id = req.params.id;

    const product = await productCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    const result = await productCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send({
      success: true,
      deletedCount: result.deletedCount,
    });

  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).send({
      success: false,
      message: "Failed to delete product",
    });
  }
};
