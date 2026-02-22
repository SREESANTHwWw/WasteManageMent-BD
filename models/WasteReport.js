const mongoose = require("mongoose");

const WasteReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "userModel",
    },

    userModel: {
      type: String,
      required: true,
      enum: ["Student", "Staff"],
    },

    wasteImage: {
      type: [String],
      required: true,
      trim: true,
    },
    wasteQty: {
      type: String,
      required: [true, "Waste quantity is required"],
      enum: {
        values: ["SMALL", "MEDIUM", "LARGE"],
        message: "Waste quantity must be SMALL, MEDIUM, or LARGE",
      },
      trim: true,
      uppercase: true,
    },

    wasteLocation: {
      type: String,
      required: true,
      trim: true,
    },
    landmark: {
      type: String,

      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    wasteCategory: {
      type: String,
      required: true,
      enum: ["PLASTIC", "ORGANIC", "PAPER", "OTHERS"],
    },

    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "RESOLVED"],
      default: "PENDING",
    },
    verificationImages: { type: [String], default: [] },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    resolvedAt: {
      type: Date,
    },

    aiConfidence: { type: Number, default: null },
    aiDistribution: { type: Array, default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("WasteReport", WasteReportSchema);
