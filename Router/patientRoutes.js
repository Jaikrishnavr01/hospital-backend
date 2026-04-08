import { getFullHistoryByAppointment, getFullPatientHistory, getFullPatientHistoryByPatientId } from "../Controllers/PatientController.js";
import verifyToken from "../Middleware/verifyToken.js";
import authorizeRoles from "../Middleware/roles.js";
import express from "express";

const router = express.Router();
router.get(
  "/full-history",
  verifyToken,
authorizeRoles("user", "admin", "nurse", "doctor"),
  getFullPatientHistory
);

router.get(
  "/full-history/:patientId",
  verifyToken,
  authorizeRoles("admin", "nurse", "doctor" , "user"),
  getFullPatientHistoryByPatientId
);

router.get("/by-appointment/:appointmentId", getFullHistoryByAppointment);

export default router;
