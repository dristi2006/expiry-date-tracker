const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/user');
const sendEmail = require("../utils/sendEmail");
const JWT_SECRET = process.env.JWT_SECRET || "super_secret";

// ---- SIGNUP: Create user, send verification code, no auto-login
exports.signup = (req, res) => {
  const { email, username, password } = req.body;
  if (!email || !username || !password)
    return res.status(400).json({ error: 'All fields required' });

  db.get("SELECT 1 FROM users WHERE email = ? OR username = ?", [email, username], async (err, row) => {
    if (row) return res.status(400).json({ error: "Email/username exists" });

    const hash = await bcrypt.hash(password, 10);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Math.floor(Date.now() / 1000) + 10 * 60;

    db.run(
      "INSERT INTO users (email, username, password_hash, is_verified, verification_code, code_expires_at) VALUES (?, ?, ?, 0, ?, ?)",
      [email, username, hash, code, expires],
      async function(err) {
        if (err) return res.status(500).json({ error: 'DB error' });

        try {
          await sendEmail(
            email,
            "Your UseBy Verification Code",
            `Your UseBy signup verification code is: ${code}\n\nThis code will expire in 10 minutes.`
          );
          res.json({ needs2FA: true });
        } catch (emailErr) {
          console.error("Nodemailer SIGNUP error:", emailErr);
          return res.status(500).json({ error: "Could not send verification email." });
        }
      }
    );
  });
};

// ---- VERIFY 2FA CODE after signup
exports.verify2FA = (req, res) => {
  const { email, code } = req.body;
  if (!email || !code)
    return res.status(400).json({ error: "Email and code required." });

  db.get(
    "SELECT * FROM users WHERE email = ? AND verification_code = ? AND is_verified = 0",
    [email, code],
    (err, user) => {
      if (err || !user)
        return res.status(400).json({ error: "Invalid code or email." });

      if (Math.floor(Date.now() / 1000) > user.code_expires_at)
        return res.status(400).json({ error: "Code expired." });

      db.run(
        "UPDATE users SET is_verified = 1, verification_code = NULL, code_expires_at = NULL WHERE email = ?",
        [email],
        function (err2) {
          if (err2) return res.status(500).json({ error: "DB error" });
          const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            JWT_SECRET,
            { expiresIn: "2h" }
          );
          res.json({ token, username: user.username });
        }
      );
    }
  );
};

// ---- LOGIN: Only allow verified users, return JWT
exports.login = (req, res) => {
  const { email, password } = req.body;
  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err || !user)
      return res.status(401).json({ error: "Invalid credentials" });

    if (!user.is_verified)
      return res.status(401).json({ error: "Please verify your email before logging in." });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: "2h" }
    );
    res.json({ token, username: user.username });
  });
};

// ---- RESEND 2FA CODE for unverified users
exports.resend2FA = (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.status(400).json({ error: "Email required." });

  db.get(
    "SELECT * FROM users WHERE email = ? AND is_verified = 0",
    [email],
    async (err, user) => {
      if (err || !user)
        return res.status(400).json({ error: "User not found or already verified." });

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Math.floor(Date.now() / 1000) + 10 * 60;

      db.run(
        "UPDATE users SET verification_code = ?, code_expires_at = ? WHERE email = ?",
        [code, expires, email],
        async (err2) => {
          if (err2) return res.status(500).json({ error: "DB error" });

          try {
            await sendEmail(
              email,
              "Your UseBy Verification Code",
              `A new UseBy verification code: ${code}\n\nThis code will expire in 10 minutes.`
            );
            res.json({ message: "Verification code resent to your email." });
          } catch (emailErr) {
            console.error("Nodemailer RESEND error:", emailErr);
            res.status(500).json({ error: "Could not send email." });
          }
        }
      );
    }
  );
};
