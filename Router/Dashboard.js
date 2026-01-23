import express from "express";
import verifyToken from "../Middleware/verifyToken.js";
import authorizeRoles from "../Middleware/roles.js";

const Dashboard = express.Router();

Dashboard.get("/admin/dashboard", verifyToken, authorizeRoles("admin"), (req, res) => {
  res.json({ message: "Admin Dashboard Data" });
});

Dashboard.get("/doctor/dashboard", verifyToken, authorizeRoles("admin", "doctor"), (req, res) => {
  res.json({ message: "Doctor Dashboard Data" });
});

Dashboard.get("/nurse/dashboard", verifyToken, authorizeRoles("admin", "nurse"), (req, res) => {
  res.json({ message: "Nurse Dashboard Data" });
});

Dashboard.get("/user/dashboard", verifyToken, authorizeRoles("admin", "user"), (req, res) => {
  res.json({ message: "User Dashboard Data" });
});

export default Dashboard;
