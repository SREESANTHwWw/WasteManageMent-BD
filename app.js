const express = require("express");
const dotenv = require("dotenv");
const connectDb = require("./Db/ConnectDb");
const cors = require("cors")
dotenv.config(); 
const StudentLogin = require("./Controllers/StudentControllers/StudentLoginController")
const Staff = require("./Controllers/StaffController/StaffController")
const ReportWaster = require("./Controllers/ReportController/ReportController")
const certificateRoute = require("./Controllers/certificateController/certificateController");
const path = require("path");
const app = express();
app.use(express.json());
app.use(cors())
app.get("/check", (req, res) => {
  res.send("Hi, I’m running now 🚀");
});
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/v1/" ,StudentLogin)
app.use("/api/v1/",Staff)
app.use("/api/v1/",ReportWaster )
app.use("/api/v1/",certificateRoute)

const start = async () => {
  try {
    await connectDb();

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server failed to start ❌");
    console.error(error.message);
    process.exit(1);
  }
};

start();
