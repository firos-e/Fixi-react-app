const express = require("express");
const router = express.Router();
const bookingController = require("../Controllers/bookingController");
const authMiddleware = require("../Middleware/authmiddleware");

// all booking routes are protected
router.post("/create", authMiddleware, bookingController.createBooking);
router.get("/nearby-technicians", authMiddleware, bookingController.getNearbyTechnicians);
router.get("/user-bookings", authMiddleware, bookingController.getUserBookings);
router.get("/tech-bookings", authMiddleware, bookingController.getTechBookings);
router.patch("/:bookingId/status", authMiddleware, bookingController.updateBookingStatus);

module.exports = router;
