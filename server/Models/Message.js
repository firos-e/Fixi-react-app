const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    senderRole: {
      type: String,
      enum: ["user", "technician"],
      required: true
    },
    readByRoles: {
      type: [
        {
          type: String,
          enum: ["user", "technician"]
        }
      ],
      default: []
    },
    text: {
      type: String,
      required: true,
      trim: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
