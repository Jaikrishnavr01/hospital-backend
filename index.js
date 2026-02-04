import express from "express";
import dotenv from "dotenv";

import connectDB from './Config/db.js'
import userRoutes from "./Router/User.js";

import Dashboard from "./Router/Dashboard.js";
import appointmentRoutes from "./Router/appointmentRoutes.js";
import opRouters from "./Router/opRoutes.js"
import patientRoutes from "./Router/patientRoutes.js"
import pharmacy from "./Router/pharmacy.js"
import hospitalRoute from "./Router/hospitalRoutes.js";
import doctorRoutes from "./Router/doctorRoutes.js";
import "./cron/expireAppointment.js";
import cors from "cors"
import path from "path";

dotenv.config();
connectDB();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/auth", userRoutes);

app.use("/", Dashboard)
app.use("/api/hospital", hospitalRoute);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/p", pharmacy)
app.use("/api/op",opRouters )

app.get("/", (req, res) => {
  res.json({ message: "hospital booking site is working prefect" });
});

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
