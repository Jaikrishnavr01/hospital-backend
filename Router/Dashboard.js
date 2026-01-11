import express from "express";
import verifyToken from "../Middleware/verifyToken.js";
import { isAdmin, isDoctor, isNurse, isUser } from "../Middleware/roles.js";

const Dashboard = express.Router();

Dashboard.get("/admin/dashboard", verifyToken, isAdmin, (req, res) => {
  res.json({ message: "Admin Dashboard Data" });
});

Dashboard.get("/doctor/dashboard", verifyToken, isDoctor, (req, res) => {
  res.json({ message: "Doctor Dashboard Data" });
});

Dashboard.get("/nurse/dashboard", verifyToken, isNurse, (req, res) => {
  res.json({ message: "Nurse Dashboard Data" });
});

Dashboard.get("/user/dashboard", verifyToken, isUser, (req, res) => {
  res.json({ message: "User Dashboard Data" });
});

export default Dashboard;
