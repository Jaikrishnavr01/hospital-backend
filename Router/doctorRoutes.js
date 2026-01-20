import express from "express";
import { addDoctorAvailability, getDoctorSlots, savePrescription, sendPrescriptionToPharmacy, startConsultation } from "../Controllers/doctorController.js";
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

export default router;
