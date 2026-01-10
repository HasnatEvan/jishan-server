const jwt = require("jsonwebtoken");

/* =====================
   GENERATE JWT
===================== */
exports.generateJWT = async (req, res) => {
  const user = req.body; // expecting { email: "abc@email.com" }

  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "7d",
  });

  res
    .cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    })
    .send({ success: true });
};

/* =====================
   LOGOUT
===================== */
exports.logout = (req, res) => {
  res
    .clearCookie("token", {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    })
    .send({ success: true });
};
