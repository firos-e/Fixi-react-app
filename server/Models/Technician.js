const mongoose = require("mongoose");

const technicianSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: "technician"
  },
  phone: {
    type: String,
    default: ""
  },
  secondaryPhone: {
    type: String,
    default: ""
  },
  services: {
    type: [String],
    default: []
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    address: {
      type: String,
      default: ""
    }
  },
  profilePicture: {
    type: String,
    default: ""
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

technicianSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Technician", technicianSchema);
