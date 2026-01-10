const client = require("../config/db");

/* =====================
   COLLECTION
===================== */
const userCollection = client
  .db("e_cormmerce")
  .collection("users");

/* =====================
   SAVE USER
===================== */
exports.saveUser = async (req, res) => {
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
    console.error("Save user error:", error);
    res.status(500).send({ message: "Failed to save user" });
  }
};

/* =====================
   GET USER ROLE
===================== */
exports.getUserRole = async (req, res) => {
  try {
    const email = req.params.email;

    const result = await userCollection.findOne({ email });

    res.send({ role: result?.role });

  } catch (error) {
    console.error("Get user role error:", error);
    res.status(500).send({ message: "Failed to get user role" });
  }
};



/* =====================
   GET ALL USERS
===================== */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await userCollection.find().toArray();
    res.send(users);
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).send({ message: "Failed to get users" });
  }
};





/* =====================
   CHECK USER EMAIL EXISTS
===================== */
exports.checkUserEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).send({ exists: false });
    }

    const user = await userCollection.findOne({ email });

    if (user) {
      res.send({ exists: true });
    } else {
      res.send({ exists: false });
    }

  } catch (error) {
    console.error("Check email error:", error);
    res.status(500).send({ exists: false });
  }
};
