const { ObjectId } = require("mongodb");
const client = require("../config/db");

/* =====================
   COLLECTIONS
===================== */
const ordersCollection = client
  .db("e_cormmerce")
  .collection("orders");

const productCollection = client
  .db("e_cormmerce")
  .collection("products");

const cartCollection = client
  .db("e_cormmerce")
  .collection("carts");

const userCollection = client
  .db("e_cormmerce")
  .collection("users");

/* =====================
   PLACE ORDER
===================== */
exports.placeOrder = async (req, res) => {
  try {
    const order = req.body;
    const items = order.items;

    if (!items || items.length === 0) {
      return res.status(400).send({
        success: false,
        message: "No order items found",
      });
    }

    // 🔍 STEP 1: Stock check
    for (const item of items) {
      const product = await productCollection.findOne({
        _id: new ObjectId(item.productId),
      });

      if (!product) {
        return res.status(404).send({
          success: false,
          message: "Product not found",
        });
      }

      if (product.quantity < Number(item.quantity)) {
        return res.status(400).send({
          success: false,
          message: `Not enough stock for ${product.name}`,
        });
      }
    }

    // ✅ STEP 2: Save order
    const orderResult = await ordersCollection.insertOne({
      ...order,
      orderTime: new Date(),
      orderTimestamp: Date.now(),
    });

    // 🔻 STEP 3: Reduce stock
    for (const item of items) {
      await productCollection.updateOne(
        { _id: new ObjectId(item.productId) },
        {
          $inc: {
            quantity: -Number(item.quantity),
          },
        }
      );
    }

    // 🧹 STEP 4: Clear user's cart
    await cartCollection.deleteMany({
      userEmail: req.user.email,
    });

    res.send({
      success: true,
      orderId: orderResult.insertedId,
    });

  } catch (error) {
    console.error("Order error:", error);
    res.status(500).send({
      success: false,
      message: "Order failed",
    });
  }
};

/* =====================
   GET ALL ORDERS (ADMIN)
===================== */
exports.getAllOrders = async (req, res) => {
  const result = await ordersCollection
    .find()
    .sort({ createdAt: -1 })
    .toArray();

  res.send(result);
};

/* =====================
   GET CUSTOMER ORDERS
===================== */
exports.getCustomerOrders = async (req, res) => {
  try {
    const orders = await ordersCollection
      .find({ userEmail: req.params.email })
      .toArray();

    res.send(orders);
  } catch (error) {
    res.status(500).send({ message: "Something went wrong" });
  }
};

/* =====================
   DELETE ORDER + RESTORE STOCK (ADMIN)
===================== */
exports.deleteOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    // 🔒 Admin check
    const admin = await userCollection.findOne({
      email: req.user.email,
    });

    if (admin?.role !== "admin") {
      return res.status(403).send({ message: "Forbidden access" });
    }

    // 🔍 Find order
    const order = await ordersCollection.findOne({
      _id: new ObjectId(orderId),
    });

    if (!order) {
      return res.status(404).send({ message: "Order not found" });
    }

    // 🔁 Restore stock
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        await productCollection.updateOne(
          { _id: new ObjectId(item.productId) },
          {
            $inc: {
              quantity: Number(item.quantity),
            },
          }
        );
      }
    }

    // ❌ Delete order
    const result = await ordersCollection.deleteOne({
      _id: new ObjectId(orderId),
    });

    res.send({
      success: true,
      message: "Order deleted & stock restored",
      deletedCount: result.deletedCount,
    });

  } catch (error) {
    console.error("Delete order error:", error);
    res.status(500).send({ message: "Failed to delete order" });
  }
};

/* =====================
   UPDATE ORDER STATUS (ADMIN)
===================== */
exports.updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    const allowedStatus = [
      "pending",
      "processing",
      "delivered",
      "returned",
      "cancelled",
    ];

    if (!allowedStatus.includes(status)) {
      return res.status(400).send({
        success: false,
        message: "Invalid order status",
      });
    }

    // 🔒 Admin check
    const admin = await userCollection.findOne({
      email: req.user.email,
    });

    if (admin?.role !== "admin") {
      return res.status(403).send({
        success: false,
        message: "Forbidden access",
      });
    }

    // 🔍 Check order exists
    const order = await ordersCollection.findOne({
      _id: new ObjectId(orderId),
    });

    if (!order) {
      return res.status(404).send({
        success: false,
        message: "Order not found",
      });
    }

    // 🔄 Update status
    const result = await ordersCollection.updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          status,
          statusUpdatedAt: new Date(),
        },
      }
    );

    res.send({
      success: true,
      message: "Order status updated successfully",
      modifiedCount: result.modifiedCount,
    });

  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).send({
      success: false,
      message: "Failed to update order status",
    });
  }
};
