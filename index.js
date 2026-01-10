require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const client = require("./config/db");

const app = express();
const port = process.env.PORT || 5000;

/* =====================
   MIDDLEWARE
===================== */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://server.fastforwardlogistics.org",
      "https://fastforwardlogistics.org",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

/* =====================
   ROUTES (ALL)
===================== */
app.use(require("./routes/auth.routes"));
app.use(require("./routes/otp.routes"));
app.use(require("./routes/user.routes"));
app.use(require("./routes/product.routes"));
app.use(require("./routes/cart.routes"));
app.use(require("./routes/wishlist.routes"));
app.use(require("./routes/order.routes"));

/* =====================
   ROOT
===================== */
app.get("/", (req, res) => {
  res.send("Hello from plantNet Server..");
});

/* =====================
   SERVER + DB CONNECT
===================== */
async function startServer() {
  try {
    await client.connect();
    console.log("✅ MongoDB connected successfully");

    app.listen(port, () => {
      console.log(`🚀 plantNet running on port ${port}`);
    });
  } catch (error) {
    console.error("❌ Server start failed:", error);
  }
}

startServer();
