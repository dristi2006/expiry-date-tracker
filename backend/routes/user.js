const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Auth routes for signup/login/2fa
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/verify-2fa", authController.verify2FA);

// (add other user/account routes here...)

module.exports = router;
