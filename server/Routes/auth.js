const express = require("express");
const router = express.Router();

const { signup, login, getMe, updateProfile } = require("../Controllers/authcontroller");
const authMiddleware = require("../Middleware/authmiddleware");

// routes
router.post("/signup", signup);
router.post("/login", login);
router.get("/me", authMiddleware, getMe);
router.patch("/profile", authMiddleware, updateProfile);

module.exports = router;
