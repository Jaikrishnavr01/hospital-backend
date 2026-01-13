import express from "express";
import dotenv from "dotenv";

import connectDB from './Config/db.js'
import userRoutes from "./Router/User.js";

import Dashboard from "./Router/Dashboard.js";
import appointmentRoutes from "./Router/appointmentRoutes.js";
import opRouters from "./Router/opRoutes.js"
import doctorRoutes from "./Router/doctorRoutes.js";
import "./cron/expireAppointment.js";

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

app.use("/auth", userRoutes);

app.use("/", Dashboard)
app.use("/api/appointments", appointmentRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/op",opRouters )

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
