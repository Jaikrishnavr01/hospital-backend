import express from "express";
import {
  requestAppointment,
  confirmAppointment,
  cancelAppointment,
  getAllAppointments,
  getMyAppointments
} from "../Controllers/appointmentController.js";

import verifyToken from "../Middleware/verifyToken.js";
import authorizeRoles from "../Middleware/roles.js";

const router = express.Router();

//  Request / Book appointment
router.post("/book", verifyToken, authorizeRoles("user", "admin"), requestAppointment);

//  Confirm appointment
router.put("/confirm/:id", verifyToken, authorizeRoles("nurse", "doctor", "admin"), confirmAppointment);

//  Cancel appointment
router.put("/cancel/:id", verifyToken, authorizeRoles("user", "nurse", "admin"), cancelAppointment);

//  View all appointments
router.get("/all", verifyToken, authorizeRoles("user", "nurse", "admin", "doctor"), getAllAppointments);

//  View my appointments
router.get("/my", verifyToken, authorizeRoles("user"), getMyAppointments);

export default router;
