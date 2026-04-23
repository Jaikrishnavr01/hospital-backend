import express from "express";
import dotenv from "dotenv";
import path from "path";

import connectDB from "./Config/db.js";
import userRoutes from "./Router/User.js";
import Dashboard from "./Router/Dashboard.js";
import appointmentRoutes from "./Router/appointmentRoutes.js";
import opRouters from "./Router/opRoutes.js";
import patientRoutes from "./Router/patientRoutes.js";
import pharmacy from "./Router/pharmacy.js";
import hospitalRoute from "./Router/hospitalRoutes.js";
import doctorRoutes from "./Router/doctorRoutes.js";

import "./cron/expireAppointment.js";
import "./cron/index.js";

dotenv.config();
connectDB();

const app = express();


// 🔥 GLOBAL CORS HANDLER (ALLOW ALL ORIGINS)
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // allow any origin dynamically
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  // ✅ handle preflight request
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});


// ✅ Middlewares
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));


// ✅ Routes
app.use("/auth", userRoutes);
app.use("/", Dashboard);
app.use("/api/hospital", hospitalRoute);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/p", pharmacy);
app.use("/api/op", opRouters);


// ✅ Test route
app.get("/", (req, res) => {
  res.json({ message: "hospital booking site is working perfect" });
});


// ✅ Start server (ONLY for local / Render)
const PORT = process.env.PORT || 8001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));