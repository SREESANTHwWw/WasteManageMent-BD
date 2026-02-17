const mongoose = require("mongoose");

const WasteReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    wasteImage: {
      type: [String],
      required: true,
      trim: true,
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

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
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
