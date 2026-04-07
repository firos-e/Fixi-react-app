const express = require("express");
const router = express.Router();
const authMiddleware = require("../Middleware/authmiddleware");
const chatController = require("../Controllers/chatController");

router.get("/summary", authMiddleware, chatController.getUnreadSummary);
router.get("/booking/:bookingId/messages", authMiddleware, chatController.getBookingMessages);
router.patch("/booking/:bookingId/read", authMiddleware, chatController.markBookingMessagesRead);
router.post("/booking/:bookingId/messages", authMiddleware, chatController.sendBookingMessage);

module.exports = router;
