const express = require("express");
const { upload, saveAsWebP } = require("../../Utils/Multer");
const authMiddleware = require("../../Middleware/AuthMiddleware");
const roleMiddleware = require("../../Middleware/RoleBasedMiddlware");
const WasteReport = require("../../models/WasteReport");
const StudentsModel = require("../../models/StudentsModel");

const Router = express.Router();

Router.post(
  "/report/waste",
  authMiddleware,
  upload.single("wasteImage"),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { wasteLocation ,description,wasteCategory } = req.body;

      if (!wasteLocation || wasteLocation.trim().length < 3) {
        return res.status(400).json({ success: false, msg: "Waste location is required" });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, msg: "wasteImage is required" });
      }

     
      const fileName = await saveAsWebP(req.file.buffer, req.file.originalname);

    
      const wasteImage = `${req.protocol}://${req.get(
        "host",
      )}/uploads/${fileName}`; // recommended for frontend access

      const reportWaste = await WasteReport.create({
        userId,
        wasteLocation: wasteLocation.trim(),
        description,
        wasteCategory,
        wasteImage,
        status: "PENDING",
      });

      await StudentsModel.findByIdAndUpdate(userId,{
        $inc:{rewardPoint : 100}
      },
      {new:true}
    
    )

      return res.status(201).json({
        success: true,
        msg: "Waste report submitted successfully",
        reportWaste,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, msg: error.message || "Internal Server Error" });
    }
  }
);

Router.get("/get/reports", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);
    const skip = (page - 1) * limit;

    // optional filters
    const filter = { userId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.wasteCategory) filter.wasteCategory = req.query.wasteCategory;

    const [orders, total] = await Promise.all([
      WasteReport.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WasteReport.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      orders,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, msg: error.message || "Internal Server Error" });
  }
});


module.exports = Router;