import express from "express";
import {
  bookAppointment,
  confirmAppointment,
  cancelAppointment,
  getAllAppointments,
  getMyAppointments
} from "../Controllers/appointmentController.js";
import verifyToken from "../Middleware/verifyToken.js";
import authorizeRoles from "../Middleware/roles.js";

const router = express.Router();

// Book appointment
router.post("/book", verifyToken, authorizeRoles("user", "admin"), bookAppointment);

// Confirm appointment
router.put("/confirm/:id", verifyToken, authorizeRoles("nurse", "doctor", "admin"), confirmAppointment);

// Cancel appointment
router.put("/cancel/:id", verifyToken, authorizeRoles("user", "nurse", "admin"), cancelAppointment);

// View all (nurse + admin + user)
router.get("/all", verifyToken, authorizeRoles("nurse","user", "admin" , "doctor"), getAllAppointments);

// View own (user)
router.get("/my", verifyToken, authorizeRoles("user"), getMyAppointments);

export default router;
