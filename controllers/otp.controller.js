const otpStore = require("../utils/otpStore");
const transporter = require("../config/nodemailer");

/* =====================
   SEND OTP
===================== */
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).send({ message: "Email is required" });
    }

    // 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    otpStore[email] = {
      code: otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min
    };

    await transporter.sendMail({
      from: process.env.NODEMAILER_USER,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
    });

    res.send({ success: true, message: "OTP sent to email" });

  } catch (err) {
    console.error("OTP send error:", err);
    res
      .status(500)
      .send({ success: false, message: "Failed to send OTP" });
  }
};

/* =====================
   VERIFY OTP
===================== */
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).send({ message: "Email and OTP required" });
    }

    const stored = otpStore[email];

    if (!stored) {
      return res.status(400).send({ message: "OTP not found" });
    }

    if (Date.now() > stored.expiresAt) {
      delete otpStore[email];
      return res.status(400).send({ message: "OTP expired" });
    }

    if (String(stored.code) !== String(otp)) {
      return res.status(400).send({ message: "Invalid OTP" });
    }

    delete otpStore[email];

    res.send({ success: true, message: "OTP verified successfully" });

  } catch (err) {
    console.error("OTP verify error:", err);
    res
      .status(500)
      .send({ success: false, message: "Failed to verify OTP" });
  }
};
