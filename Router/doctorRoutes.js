import express from "express";
import { addDoctorAvailability, getAllDoctors, getDoctorSlots, savePrescription, sendPrescriptionToPharmacy, setDoctorDepartment, startConsultation } from "../Controllers/doctorController.js";
import verifyToken from "../Middleware/verifyToken.js";
import authorizeRoles  from "../Middleware/roles.js";
import allowOnlyPaidVisit from "../Middleware/allowOnlyPaidView.js";
import { getEPrescriptionByVisit } from "../Controllers/prescriptionController.js";

const router = express.Router();

// Get available slots
router.get("/slots", verifyToken, authorizeRoles("user", "doctor", "admin"), getDoctorSlots);

router.post(
  "/availability",
  verifyToken,
  authorizeRoles("doctor", "admin"),
  addDoctorAvailability
);

router.post(
  "/consult/:visitId",
  verifyToken,
  authorizeRoles("doctor"),
  allowOnlyPaidVisit,
  startConsultation,
  savePrescription,
  sendPrescriptionToPharmacy
);


router.get(
  "/prescription/visit/:visitId",
  verifyToken,
  authorizeRoles("doctor", "admin", "nurse", "user"),
  getEPrescriptionByVisit
);

// Admin sets/updates department for doctor
router.put("/department", verifyToken, authorizeRoles("admin", "doctor"), setDoctorDepartment);

// Get all doctors
router.get("/all", verifyToken, authorizeRoles("admin", "doctor", "user"), getAllDoctors);

export default router;
