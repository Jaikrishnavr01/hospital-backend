import express from "express";
import {
  addDoctorAvailability,
  getActiveAppointmentsByDoctor,
  getAllDoctors,
  getDoctorAvailabilityCalendar,
  getDoctorSlots, // ✅ already used (12-hr logic inside controller)
  getUpcomingAppointmentsByDoctor,
  savePrescription,
  sendPrescriptionToPharmacy,
  setDoctorDepartmentAndRegnum,
  startConsultation,
  uploadDoctorSignature
} from "../Controllers/doctorController.js";

import verifyToken from "../Middleware/verifyToken.js";
import authorizeRoles from "../Middleware/roles.js";
import allowOnlyPaidVisit from "../Middleware/allowOnlyPaidView.js";
import { getEPrescriptionByVisit } from "../Controllers/prescriptionController.js";
import { uploadSignature } from "../Middleware/uploadSignature.js";
import { getVisit } from "../Controllers/registerOpAndGenerateBill .js";

const router = express.Router();

// Get available slots (NOW RETURNS 12-HR FORMAT)
router.get(
  "/slots",
  verifyToken,
  authorizeRoles("user", "doctor", "admin"),
  getDoctorSlots
);

// Add availability
router.post(
  "/availability",
  verifyToken,
  authorizeRoles("doctor", "admin", "nurse"),
  addDoctorAvailability
);

// Availability calendar
router.get(
  "/:doctorId/availability",
  verifyToken,
  authorizeRoles("user", "doctor", "admin", "nurse"),
  getDoctorAvailabilityCalendar
);

// Start consultation
router.post(
  "/consult/:visitId",
  verifyToken,
  getVisit,
  authorizeRoles("doctor"),
  allowOnlyPaidVisit,
  startConsultation,
  savePrescription,
  sendPrescriptionToPharmacy
);

// Get prescription
router.get(
  "/prescription/visit/:visitId",
  verifyToken,
  authorizeRoles("doctor", "admin", "nurse", "user"),
  getEPrescriptionByVisit
);

// Upload signature
router.post(
  "/:id/signature",
  verifyToken,
  authorizeRoles("doctor", "admin"),
  uploadSignature.single("signature"),
  uploadDoctorSignature
);

// Active appointments
router.get(
  "/:doctorId/appointments/active",
  verifyToken,
  authorizeRoles("doctor"),
  getActiveAppointmentsByDoctor
);

// Upcoming appointments
router.get(
  "/:doctorId/appointments/upcoming",
  verifyToken,
  authorizeRoles("doctor"),
  getUpcomingAppointmentsByDoctor
);

// Department & reg number
router.put(
  "/department-reg",
  verifyToken,
  authorizeRoles("admin", "doctor"),
  setDoctorDepartmentAndRegnum
);

// Get all doctors
router.get(
  "/all",
  verifyToken,
  authorizeRoles("admin", "doctor", "user"),
  getAllDoctors
);

export default router;
