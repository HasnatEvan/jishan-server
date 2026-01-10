const { ObjectId } = require("mongodb");
const client = require("../config/db");

/* =====================
   COLLECTIONS
===================== */
const cartCollection = client
  .db("e_cormmerce")
  .collection("carts");

const productCollection = client
  .db("e_cormmerce")
  .collection("products");

/* =====================
   ADD TO CART
===================== */
exports.addToCart = async (req, res) => {
  try {
    const product = req.body;

    // must have email
    if (!product.userEmail) {
      return res.status(400).send({ message: "User email missing" });
    }

    // find product in DB
    const dbProduct = await productCollection.findOne({
      _id: new ObjectId(product.productId),
    });

    if (!dbProduct) {
      return res.status(404).send({ message: "Product not found" });
    }

    // invalid quantity
    if (!product.cartQuantity || product.cartQuantity < 1) {
      return res.status(400).send({ message: "Invalid quantity" });
    }

    // stock exceeded
    if (product.cartQuantity > dbProduct.quantity) {
      return res.status(400).send({
        message: "Stock limit exceeded",
      });
    }

    // remove _id if sent
    if (product._id) delete product._id;

    const result = await cartCollection.insertOne(product);
    res.send(result);

  } catch (error) {
    console.error("Cart insert error:", error);
    res.status(500).send({ message: "Failed to add to cart" });
  }
};

/* =====================
   GET CART BY EMAIL
===================== */
exports.getCartByEmail = async (req, res) => {
  const email = req.query.email;

  if (!email) {
    return res.status(400).send({ message: "Email required" });
  }

  const result = await cartCollection
    .find({ userEmail: email })
    .toArray();

  res.send(result);
};

/* =====================
   UPDATE CART QUANTITY
===================== */
exports.updateCartQuantity = async (req, res) => {
  try {
    const id = req.params.id;
    const { cartQuantity } = req.body;

    if (!cartQuantity || cartQuantity < 1) {
      return res.status(400).send({ message: "Invalid quantity" });
    }

    const cartItem = await cartCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!cartItem) {
      return res.status(404).send({ message: "Cart item not found" });
    }

    const dbProduct = await productCollection.findOne({
      _id: new ObjectId(cartItem.productId),
    });

    if (!dbProduct) {
      return res.status(404).send({ message: "Product not found" });
    }

    if (cartQuantity > dbProduct.quantity) {
      return res.status(400).send({
        message: "Stock limit exceeded",
      });
    }

    const result = await cartCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { cartQuantity } }
    );

    res.send(result);

  } catch (error) {
    console.error("Cart update error:", error);
    res.status(500).send({ message: "Failed to update quantity" });
  }
};

/* =====================
   DELETE CART ITEM
===================== */
exports.deleteCartItem = async (req, res) => {
  const id = req.params.id;

  const result = await cartCollection.deleteOne({
    _id: new ObjectId(id),
  });

  if (result.deletedCount === 0) {
    return res.status(404).send({ message: "Item not found" });
  }

  res.send(result);
};
