require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

/* =====================
   MIDDLEWARE
===================== */
const corsOptions = {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
    optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

/* =====================
   JWT VERIFY MIDDLEWARE
===================== */
const verifyToken = (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).send({ message: "Unauthorized access" });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "Unauthorized access" });
        }
        req.user = decoded;
        next();
    });
};

/* =====================
   MONGODB CONNECTION
===================== */
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nnldx.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        const userCollection = client.db("e_cormmerce").collection("users");
        const productCollection = client.db("e_cormmerce").collection("products");
        const cartCollection = client.db("e_cormmerce").collection("carts");
        const WishlistCollection = client.db("e_cormmerce").collection("wishlists");
        const ordersCollection = client.db("e_cormmerce").collection("orders");

        /* =====================
           JWT GENERATE
        ===================== */
        app.post("/jwt", async (req, res) => {
            const { email } = req.body;

            const token = jwt.sign(
                { email },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: "365d" }
            );

            res
                .cookie("token", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite:
                        process.env.NODE_ENV === "production" ? "none" : "strict",
                })
                .send({ success: true });
        });

        /* =====================
           LOGOUT
        ===================== */
        app.get("/logout", async (req, res) => {
            res
                .clearCookie("token", {
                    maxAge: 0,
                    secure: process.env.NODE_ENV === "production",
                    sameSite:
                        process.env.NODE_ENV === "production" ? "none" : "strict",
                })
                .send({ success: true });
        });





        /* =====================
           SAVE USER
        ===================== */
        app.post("/users/:email", async (req, res) => {
            try {
                const email = req.params.email;
                const user = req.body;

                const existingUser = await userCollection.findOne({ email });

                if (existingUser) {
                    return res.status(200).send(existingUser);
                }

                // 🇧🇩 Bangladesh time
                const bdTime = new Date().toLocaleString("en-US", {
                    timeZone: "Asia/Dhaka",
                });

                const result = await userCollection.insertOne({
                    ...user,
                    email,
                    role: "customer",
                    createdAt: bdTime,
                });

                res.status(201).send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to save user" });
            }
        });


        app.get('/users/role/:email', async (req, res) => {
            const email = req.params.email
            const result = await userCollection.findOne({ email })
            res.send({ role: result?.role })
        })



















        /* =====================
              SAVE Products
           ===================== */


        /* =====================
   SAVE PRODUCT
===================== */
        app.post("/products", verifyToken, async (req, res) => {
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
        });



        app.get('/all-products', async (req, res) => {
            const result = await productCollection
                .aggregate([{ $sample: { size: 100 } }]) // 100 মানে যতগুলো চাও
                .toArray();

            res.send(result);
        });


        app.get("/products/search", async (req, res) => {
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
        });

        /* =====================
           GET PRODUCTS (ALL + CATEGORY WISE)
        ===================== */
        app.get("/products", async (req, res) => {
            const { category } = req.query;

            const query = category
                ? { category: { $regex: `^${category}$`, $options: "i" } }
                : {};

            const result = await productCollection
                .find(query)
                .sort({ _id: -1 })
                .toArray();

            res.send(result);
        });


        /* =====================
           GET SINGLE PRODUCT
        ===================== */
        app.get("/products/:id", async (req, res) => {
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
        });

        /* =====================
           GET CATEGORIES
        ===================== */
        app.get("/categories", async (req, res) => {
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
        });

        /* =====================
           GET POPULAR CATEGORIES
        ===================== */
        app.get("/popular-categories", async (req, res) => {
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
        });


        // UPDATE PRODUCT
        app.put("/products/:id", verifyToken, async (req, res) => {
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
        });






        // DELETE PRODUCT
        app.delete("/products/:id", verifyToken, async (req, res) => {
            try {
                const id = req.params.id;

                // 🔍 product exists কিনা check
                const product = await productCollection.findOne({
                    _id: new ObjectId(id),
                });

                if (!product) {
                    return res.status(404).send({
                        success: false,
                        message: "Product not found",
                    });
                }

                // ❌ Optional: Admin only restriction
                // const user = await userCollection.findOne({ email: req.user.email });
                // if (user?.role !== "admin") {
                //   return res.status(403).send({ message: "Forbidden access" });
                // }

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
        });






















        /* =====================
              SAVE Cart Products
         ===================== */

        app.post("/carts", verifyToken, async (req, res) => {
            try {
                const product = req.body;

                // 🔒 owner check
                if (product.userEmail !== req.user.email) {
                    return res.status(403).send({ message: "Forbidden" });
                }

                const dbProduct = await productCollection.findOne({
                    _id: new ObjectId(product.productId),
                });

                if (!dbProduct) {
                    return res.status(404).send({ message: "Product not found" });
                }

                // ❌ invalid cartQuantity
                if (!product.cartQuantity || product.cartQuantity < 1) {
                    return res.status(400).send({ message: "Invalid quantity" });
                }

                // ❌ stock exceeded
                if (product.cartQuantity > dbProduct.quantity) {
                    return res.status(400).send({
                        message: "Stock limit exceeded",
                    });
                }

                if (product._id) delete product._id;

                const result = await cartCollection.insertOne(product);
                res.send(result);

            } catch (error) {
                console.error("Cart insert error:", error);
                res.status(500).send({ message: "Failed to add to cart" });
            }
        });



        // // app.get('/carts', async (req, res) => {
        // //     const result = await cartCollection.find().toArray()
        // //     res.send(result)
        // })
        app.get('/carts', verifyToken, async (req, res) => {
            const email = req.query.email;

            if (req.user.email !== email) {
                return res.status(403).send({ message: "Forbidden" });
            }

            const result = await cartCollection
                .find({ userEmail: email })
                .toArray();

            res.send(result);
        });

        // PATCH update quantity
        app.patch("/carts/:id", verifyToken, async (req, res) => {
            try {
                const id = req.params.id;
                const { cartQuantity } = req.body;

                if (!cartQuantity || cartQuantity < 1) {
                    return res.status(400).send({ message: "Invalid quantity" });
                }

                // 🔍 find cart item
                const cartItem = await cartCollection.findOne({
                    _id: new ObjectId(id),
                    userEmail: req.user.email,
                });

                if (!cartItem) {
                    return res.status(404).send({ message: "Cart item not found" });
                }

                // 🔍 find product
                const dbProduct = await productCollection.findOne({
                    _id: new ObjectId(cartItem.productId),
                });

                if (!dbProduct) {
                    return res.status(404).send({ message: "Product not found" });
                }

                // ❌ stock exceeded
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
        });




        app.delete("/carts/:id", verifyToken, async (req, res) => {
            const id = req.params.id;

            const result = await cartCollection.deleteOne({
                _id: new ObjectId(id),
                userEmail: req.user.email, // 🔒 owner check
            });

            if (result.deletedCount === 0) {
                return res.status(404).send({ message: "Item not found" });
            }

            res.send(result);
        });


















        /* =====================
              SAVE Favorite Products
         ===================== */


        app.post('/wishlists', verifyToken, async (req, res) => {
            try {
                const item = req.body;

                // 🔒 client থেকে আসা _id remove
                if (item._id) delete item._id;

                // 🔁 already wishlist এ আছে কিনা check
                const exists = await WishlistCollection.findOne({
                    productId: item.productId,
                    userEmail: item.userEmail
                });

                if (exists) {
                    return res.status(409).send({ message: "Already in wishlist" });
                }

                const result = await WishlistCollection.insertOne(item);
                res.send(result);

            } catch (error) {
                console.error("Wishlist error:", error);
                res.status(500).send({ message: "Failed to add wishlist" });
            }
        });


        app.get('/wishlists', verifyToken, async (req, res) => {
            const email = req.query.email;

            if (!email) {
                return res.status(400).send({ message: "Email is required" });
            }

            // 🔒 token user & query email match
            if (req.user.email !== email) {
                return res.status(403).send({ message: "Forbidden access" });
            }

            const result = await WishlistCollection
                .find({ userEmail: email })
                .toArray();

            res.send(result);
        });



        // DELETE wishlist (by productId)
        app.delete("/wishlists", verifyToken, async (req, res) => {
            const { productId, email } = req.query;

            if (req.user.email !== email) {
                return res.status(403).send({ message: "Forbidden" });
            }

            const result = await WishlistCollection.deleteOne({
                productId,
                userEmail: email,
            });

            res.send(result);
        });





        /* =====================
              SAVE  Products Orders
         ===================== */
        app.post('/orders', verifyToken, async (req, res) => {
            try {
                const order = req.body;
                const items = order.items;

                if (!items || items.length === 0) {
                    return res.status(400).send({
                        success: false,
                        message: "No order items found",
                    });
                }

                // 🔍 STEP 1: Stock check (before order)
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
        });




        app.get('/orders', verifyToken, async (req, res) => {
            const result = await ordersCollection
                .find()
                .sort({ createdAt: -1 }) // latest order first
                .toArray();

            res.send(result);
        });












        

        app.get("/customer-orders/:email", verifyToken, async (req, res) => {
            if (req.user.email !== req.params.email) {
                return res.status(403).send({ message: "Forbidden" });
            }

            const orders = await ordersCollection.find({
                userEmail: req.params.email,
            }).toArray();

            res.send(orders);
        });




        // =====================
// DELETE ORDER + RESTORE STOCK (ADMIN)
// =====================
app.delete("/orders/:id", verifyToken, async (req, res) => {
  try {
    const orderId = req.params.id;

    // 🔒 Admin check
    const admin = await userCollection.findOne({ email: req.user.email });
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

    // 🔁 Restore product stock
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
});



// =====================
// UPDATE ORDER STATUS (ADMIN)
// =====================
app.patch("/orders/:id", verifyToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    // ✅ Allowed statuses
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
});







        /* =====================
           DB PING
        ===================== */
        await client.db("admin").command({ ping: 1 });
        console.log("✅ MongoDB connected successfully");
    } finally {
        // client stays connected
    }
}

run().catch(console.dir);

/* =====================
   ROOT
===================== */
app.get("/", (req, res) => {
    res.send("Hello from plantNet Server..");
});

app.listen(port, () => {
    console.log(`🚀 plantNet running on port ${port}`);
});
