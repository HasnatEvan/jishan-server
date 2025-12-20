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



















        /* =====================
              SAVE Products
           ===================== */


        app.post('/products', verifyToken, async (req, res) => {
            try {
                const product = req.body;

                // 🇧🇩 Bangladesh time
                const bdTime = new Date().toLocaleString('en-US', {
                    timeZone: 'Asia/Dhaka',
                });

                const result = await productCollection.insertOne({
                    ...product,
                    createdAt: bdTime,
                });

                res.status(201).send(result);
            } catch (error) {
                res.status(500).send({ message: 'Failed to add product' });
            }
        });




        app.get('/products', async (req, res) => {
            const result = await productCollection
                .find()
                .sort({ _id: -1 })   // 🔥 last added → first
                .toArray();

            res.send(result);
        });


        app.get("/categories", async (req, res) => {
            const categories = await productCollection.aggregate([
                {
                    $group: {
                        _id: "$category",
                        categoryImage: { $first: "$categoryImage" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        name: "$_id",
                        image: "$categoryImage"
                    }
                }
            ]).toArray();

            res.send(categories);
        });

        app.get("/popular-categories", async (req, res) => {
            const categories = await productCollection.aggregate([
                {
                    $group: {
                        _id: "$category",
                        categoryImage: { $first: "$categoryImage" },
                        count: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        category: "$_id",
                        categoryImage: 1,
                        count: 1
                    }
                }
            ]).toArray();

            res.send(categories);
        });


        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productCollection.findOne(query);
            res.send(result);
        });






        /* =====================
              SAVE Cart Products
         ===================== */

        app.post('/carts', verifyToken, async (req, res) => {
            try {
                const product = req.body;

                // 🔒 owner check
                if (product.userEmail !== req.user.email) {
                    return res.status(403).send({ message: "Forbidden" });
                }

                // 🔍 Product find
                const dbProduct = await productCollection.findOne({
                    _id: new ObjectId(product.productId),
                });

                if (!dbProduct) {
                    return res.status(404).send({ message: "Product not found" });
                }

                // ❌ Out of stock
                if (dbProduct.quantity <= 0) {
                    return res.status(400).send({ message: "Product is out of stock" });
                }

                // 🔒 client _id remove
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
            const id = req.params.id;
            const { cartQuantity } = req.body;

            if (cartQuantity < 1) {
                return res.status(400).send({ message: "Invalid quantity" });
            }

            const result = await cartCollection.updateOne(
                { _id: new ObjectId(id), userEmail: req.user.email },
                { $set: { cartQuantity } }
            );

            res.send(result);
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




        app.get('/orders', async (req, res) => {
            const result = await ordersCollection.find().toArray()
            res.send(result)
        })













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
