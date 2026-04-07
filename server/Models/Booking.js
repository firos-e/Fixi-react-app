const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  technician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Technician",
    default: null
  },
  service: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ""
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "completed", "cancelled"],
    default: "pending"
  },
  location: {
    address: { type: String, default: "" },
    coordinates: { type: [Number], default: [0, 0] }
  }
}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);
