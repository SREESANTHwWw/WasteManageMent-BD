const mongoose = require("mongoose");

const StaffSchema = new mongoose.Schema(
  {
    staffID: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    dateOfBirth: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      default: "staff",
    },

  },
  { timestamps: true },
);

module.exports = mongoose.model("Staff", StaffSchema);
