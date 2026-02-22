const mongoose = require("mongoose");

const StaffSchema = new mongoose.Schema(
  {
    staffID: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    dateOfBirth: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["ONLINE", "IN_WORK", "OFFLINE"],
      default: "OFFLINE",
      required: true,
    },

    role: {
      type: String,
      default: "staff",
    },

    rewardPoint: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Staff", StaffSchema);