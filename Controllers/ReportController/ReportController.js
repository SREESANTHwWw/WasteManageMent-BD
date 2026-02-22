const express = require("express");
const { upload, saveAsWebP } = require("../../Utils/Multer");
const authMiddleware = require("../../Middleware/AuthMiddleware");
const roleMiddleware = require("../../Middleware/RoleBasedMiddlware");
const WasteReport = require("../../models/WasteReport");
const StudentsModel = require("../../models/StudentsModel");
const axios = require("axios");
const StaffModel = require("../../models/StaffModel");
const Router = express.Router();






function analyzeWasteConcepts(concepts = []) {
  const text = concepts.map((c) => (c.name || "").toLowerCase()).join(" | ");

  const plasticKeys = ["plastic", "bottle", "bag", "wrapper", "cup", "polythene", "packet"];
  const paperKeys = ["paper", "cardboard", "carton", "newspaper", "book", "magazine"];
  const organicKeys = [
    "food", "fruit", "banana", "vegetable", "peel", "organic", "leftover",
    "garbage", "trash", "waste", "compost"
  ];

  const hasAny = (arr) => arr.some((k) => text.includes(k));

  if (hasAny(plasticKeys)) return { category: "PLASTIC", isWaste: true };
  if (hasAny(paperKeys)) return { category: "PAPER", isWaste: true };
  if (hasAny(organicKeys)) return { category: "ORGANIC", isWaste: true };

  return { category: "NOT_WASTE", isWaste: false };
}

Router.post(
  "/report/waste",
  authMiddleware,
  upload.array("wasteImage", 5),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { wasteLocation, description ,landmark,wasteQty} = req.body;

      if (!wasteLocation || wasteLocation.trim().length < 3) {
        return res.status(400).json({ success: false, msg: "Waste location is required" });
      }
      if(!wasteQty){
        return res.status(400).json({success:false, msg:"Please Provide Waste qun"})
      }

      // ✅ for array upload
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, msg: "wasteImage is required" });
      }

      // 1) Save ALL images and create URL array
      const wasteImages = [];
      for (const file of req.files) {
        const fileName = await saveAsWebP(file.buffer, file.originalname);
        const url = `${req.protocol}://${req.get("host")}/uploads/${fileName}`;
        wasteImages.push(url);
      }

      // 2) Clarifai inference (use first image buffer)
      let aiMainCategory = "OTHERS";
      let aiMainConfidence = null;
      let aiDistribution = [];

      try {
        const PAT = process.env.CLARIFAI_PAT;
        const USER_ID = process.env.CLARIFAI_USER_ID || "clarifai";
        const APP_ID = process.env.CLARIFAI_APP_ID || "main";
        const MODEL_ID = process.env.CLARIFAI_MODEL_ID || "general-image-recognition";

        if (!PAT) throw new Error("CLARIFAI_PAT missing in .env");

        const firstImage = req.files[0]; // ✅ first file
        const base64 = firstImage.buffer.toString("base64");

        const url = `https://api.clarifai.com/v2/users/${USER_ID}/apps/${APP_ID}/models/${MODEL_ID}/outputs`;

        const clarifaiRes = await axios.post(
          url,
          { inputs: [{ data: { image: { base64 } } }] },
          {
            headers: {
              Authorization: `Key ${PAT}`,
              "Content-Type": "application/json",
            },
            timeout: 20000,
          }
        );

        const concepts = clarifaiRes.data?.outputs?.[0]?.data?.concepts || [];

        if (!concepts.length) {
          return res.status(400).json({
            success: false,
            msg: "Could not recognize objects. Please upload a clearer waste photo.",
          });
        }

        aiDistribution = concepts.slice(0, 10).map((c) => ({
          label: c.name,
          confidence: typeof c.value === "number" ? c.value : null,
        }));

        const result = analyzeWasteConcepts(concepts);

        if (!result.isWaste) {
          return res.status(400).json({
            success: false,
            msg: "This image does not look like waste. Please upload a clear waste photo.",
          });
        }

        aiMainCategory = result.category;
        aiMainConfidence = aiDistribution[0]?.confidence ?? null;

        const allowed = ["ORGANIC", "PAPER", "PLASTIC", "OTHERS"];
        if (!allowed.includes(aiMainCategory)) aiMainCategory = "OTHERS";
      } catch (e) {
        console.log("Clarifai classify failed:", e.response?.data || e.message);
      }
      const role = req.user.role;        // "student" or "staff"

const userModel = role === "staff" ? "Staff" : "Student";

      // 3) Save to DB (wasteImage is ARRAY now)
      const reportWaste = await WasteReport.create({
        userId,
        userModel,
        wasteLocation: wasteLocation.trim(),
        landmark,
        description,
        wasteCategory: aiMainCategory,
        wasteQty,
        wasteImage: wasteImages, 
        status: "PENDING",
        aiConfidence: aiMainConfidence,
        aiDistribution,
      });

      // 4) Reward points
      await StudentsModel.findByIdAndUpdate(
        userId,
        { $inc: { rewardPoint: 100 } },
        { new: true }
      );
          await StaffModel.findByIdAndUpdate(
        userId,
        { $inc: { rewardPoint: 100 } },
        { new: true }
      );

      return res.status(201).json({
        success: true,
        msg: "Waste report submitted successfully",
        reportWaste,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: false,
        msg: error.message || "Internal Server Error",
      });
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
        .lean().populate({
          path:"resolvedBy",
          select:"staffID fullName "
        }
          
        ),
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

Router.get(
  "/getAll/reports",
  authMiddleware,
  async (req, res) => {

    try {
       
      const page = Math.max(parseInt(req.query.page || "1", 10), 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);
      const skip = (page - 1) * limit;

      const { status, wasteCategory, start, end } = req.query;

      const filter = {};

      // optional filters
      if (status) filter.status = status;
      if (wasteCategory) filter.wasteCategory = wasteCategory;

      // date range filter (createdAt)
      if (start || end) {
        filter.createdAt = {};
        if (start) filter.createdAt.$gte = new Date(start);
        if (end) filter.createdAt.$lte = new Date(end);
      }

      const [reports, total] = await Promise.all([
        WasteReport.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean().populate({
            path:"userId",
            select:"fullName"

          }),
        WasteReport.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        reports,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: false,
        msg: error.message || "Internal Server Error",
      });
    }
  }
);


Router.patch("/update/progress/status/id", authMiddleware, async(req,res)=>{
      try {
        const { id } = req.params;
      const { status ,  } = req.body;
         const allowed = ["PENDING", "IN_PROGRESS", "RESOLVED"];
      if (!status || !allowed.includes(status)) {
        return res.status(400).json({ success: false, msg: "Invalid status" });
      }



        
      } catch (error) {
        
      }
})

Router.patch(
  "/update/status/:id",
  authMiddleware,
  upload.array("verificationImages", 5), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const allowed = ["PENDING", "IN_PROGRESS", "RESOLVED"];
      if (!status || !allowed.includes(status)) {
        return res.status(400).json({ success: false, msg: "Invalid status" });
      }

      // If resolved => proof image required
      if (status === "RESOLVED") {
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({
            success: false,
            msg: "Proof image is required when resolving a report",
          });
        }
      }

      // build proof image URLs (if uploaded)
      let proofImages = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const fileName = await saveAsWebP(file.buffer, file.originalname);
          const url = `${req.protocol}://${req.get("host")}/uploads/${fileName}`;
          proofImages.push(url);
        }
      }

      const updateData = { status };

      // if proof images uploaded, store them
      if (proofImages.length > 0) {
        updateData.$push = { verificationImages : { $each: proofImages } };
      }

      // mark resolved metadata
      if (status === "RESOLVED") {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = req.user.id; // staff/admin id
      }

      const updated = await WasteReport.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ success: false, msg: "Report not found" });
      }

      return res.status(200).json({
        success: true,
        msg: "Status updated successfully",
        report: updated,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: false,
        msg: error.message || "Internal Server Error",
      });
    }
  }
);


module.exports = Router;