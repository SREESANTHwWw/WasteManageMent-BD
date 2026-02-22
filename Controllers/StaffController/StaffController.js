const express = require("express");

const jwt = require("jsonwebtoken");
const StaffModel = require("../../models/StaffModel");
const router = express.Router();

router.post("/create/staff", async (req, res) => {
  try {
    const { staffID, dateOfBirth, fullName,email,role } = req.body;

  
    if (!staffID || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        msg: "All fields are required",
      });
    }

 
    const existingStaff = await StaffModel.findOne({ staffID });
    if (existingStaff) {
      return res.status(409).json({
        success: false,
        msg: "Staff already exists",
      });
    }

    const staff = await StaffModel.create({
      staffID,
      dateOfBirth,
      fullName,
      email,
      role
    });

    res.status(201).json({
      success: true,
      msg: "Student created successfully",
      staff,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      msg: "Internal Server Error",
    });
  }
});

router.post("/login/staff", async (req, res) => {
  try {
    const { staffID, dateOfBirth } = req.body;

    // validation
    if (!staffID || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        msg: "Staff ID and date of birth are required",
      });
    }

    // check student exists
    const staff = await StaffModel.findOne({ staffID });

    if (!staff) {
      return res.status(404).json({
        success: false,
        msg: "staff not found",
      });
    }

    // verify DOB
    if (staff.dateOfBirth !== dateOfBirth) {
      return res.status(401).json({
        success: false,
        msg: "Invalid credentials",
      });
    }

    // create token
    const token = jwt.sign(
      {
        id: staff._id,
        staffID: staff.staffID,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      msg: "Login successful",
      token,
      student: {
        id: staff._id,
        staffID: staff.staffID,
        fullName: staff.fullName,
        role:staff.role,
         status:staff.status
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

module.exports = router;
