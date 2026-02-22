const express = require("express");
const StudentsModel = require("../../models/StudentsModel");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../../Middleware/AuthMiddleware");
const router = express.Router();
const mongoose = require("mongoose");
router.post("/create/student", async (req, res) => {
  try {
    const { admissionNumber, dateOfBirth, fullName,email,role } = req.body;

  
    if (!admissionNumber || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        msg: "All fields are required",
      });
    }

 
    const existingStudent = await StudentsModel.findOne({ admissionNumber });
    if (existingStudent) {
      return res.status(409).json({
        success: false,
        msg: "Student already exists",
      });
    }

    const student = await StudentsModel.create({
      admissionNumber,
      dateOfBirth,
      fullName,
      email,role
    });

    res.status(201).json({
      success: true,
      msg: "Student created successfully",
      student,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      msg: "Internal Server Error",
    });
  }
});

router.post("/login/student", async (req, res) => {
  try {
    const { admissionNumber, dateOfBirth } = req.body;

    // validation
    if (!admissionNumber || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        msg: "Admission number and date of birth are required",
      });
    }

    // check student exists
    const student = await StudentsModel.findOne({ admissionNumber });

    if (!student) {
      return res.status(404).json({
        success: false,
        msg: "Student not found",
      });
    }

    // verify DOB
    if (student.dateOfBirth !== dateOfBirth) {
      return res.status(401).json({
        success: false,
        msg: "Invalid credentials",
      });
    }

    // create token
    const token = jwt.sign(
      {
        id: student._id,
        admissionNumber: student.admissionNumber,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      msg: "Login successful",
      token,
      student: {
        id: student._id,
        admissionNumber: student.admissionNumber,
        fullName: student.fullName,
        role:student.role
       
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      msg: "Internal Server Error",
    });
  }
});

  


router.get("/get/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await StudentsModel.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(userId) },
      },
      {
        $lookup: {
          from: "wastereports",
          localField: "_id",
          foreignField: "userId",
          as: "wastereports",
        },
      },
      {
        $addFields: {
          wastereports: {
            $slice: [
              {
                $sortArray: {
                  input: "$wastereports",
                  sortBy: { createdAt: -1 },
                },
              },
              4, 
            ],
          },
        },
      },
      {
        $project: {
          dateOfBirth: 0,
        },
      },
    ]);

    if (!user.length) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user: user[0],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      msg: error.message || "Internal Server Error",
    });
  }
});

router.get("/get/all-students", authMiddleware, async (req, res) => {
  try {
   
 

    const page = Math.max(parseInt(req.query.page || "1"), 1);
    const limit = Math.min(parseInt(req.query.limit || "10"), 50);
    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      StudentsModel.find()
        .select("-dateOfBirth") // remove sensitive field
        .sort({ rewardPoint: -1 }) // highest points first (leaderboard style)
        .skip(skip)
        .limit(limit)
        .lean(),

      StudentsModel.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      page,
      total,
      totalPages: Math.ceil(total / limit),
      students,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      msg: error.message || "Internal Server Error",
    });
  }
});

router.get("/leaderboard", async (req, res) => {
  try {
    const topStudents = await StudentsModel.find()
      .select("fullName rewardPoint role")
      .sort({ rewardPoint: -1 })
      .limit(10)
      .lean();

    res.status(200).json({
      success: true,
      students: topStudents,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
});



module.exports = router;
