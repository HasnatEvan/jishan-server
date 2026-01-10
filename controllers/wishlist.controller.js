const client = require("../config/db");

/* =====================
   COLLECTION
===================== */
const WishlistCollection = client
  .db("e_cormmerce")
  .collection("wishlists");

/* =====================
   ADD TO WISHLIST
===================== */
exports.addToWishlist = async (req, res) => {
  try {
    const item = req.body;

    if (!item?.userEmail || !item?.productId) {
      return res.status(400).send({ message: "Missing data" });
    }

    // remove _id if sent
    if (item._id) delete item._id;

    // already exists?
    const exists = await WishlistCollection.findOne({
      productId: item.productId,
      userEmail: item.userEmail,
    });

    if (exists) {
      return res.status(409).send({ message: "Already in wishlist" });
    }

    const result = await WishlistCollection.insertOne(item);
    res.send(result);

  } catch (error) {
    console.error("Wishlist add error:", error);
    res.status(500).send({ message: "Failed to add wishlist" });
  }
};

/* =====================
   GET WISHLIST BY EMAIL
===================== */
exports.getWishlistByEmail = async (req, res) => {
  const email = req.query.email;

  if (!email) {
    return res.status(400).send({ message: "Email is required" });
  }

  try {
    const result = await WishlistCollection
      .find({ userEmail: email })
      .toArray();

    res.send(result);
  } catch (error) {
    console.error("Wishlist fetch error:", error);
    res.status(500).send({ message: "Failed to get wishlist" });
  }
};

/* =====================
   DELETE FROM WISHLIST
===================== */
exports.deleteWishlistItem = async (req, res) => {
  const { productId, email } = req.query;

  if (!productId || !email) {
    return res.status(400).send({ message: "productId and email required" });
  }

  try {
    const result = await WishlistCollection.deleteOne({
      productId,
      userEmail: email,
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Item not found" });
    }

    res.send(result);
  } catch (error) {
    console.error("Wishlist delete error:", error);
    res.status(500).send({ message: "Failed to delete item" });
  }
};
