const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
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
    enum: ["user", "technician", "admin"],
    default: "user"
  },
  phone: {
    type: String,
    default: ""
  },
  secondaryPhone: {
    type: String,
    default: ""
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],  // [longitude, latitude]
      default: [0, 0]
    },
    address: {
      type: String,   // "Kochi, Kerala"
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

// ✅ required for $near geospatial queries
userSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("User", userSchema);
