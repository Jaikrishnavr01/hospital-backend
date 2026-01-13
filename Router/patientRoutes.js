import { getFullPatientHistory, getFullPatientHistoryByPatientId } from "../Controllers/PatientController.js";
import verifyToken from "../Middleware/verifyToken.js";
import authorizeRoles from "../Middleware/roles.js";
import express from "express";

const router = express.Router();
router.get(
  "/full-history",
  verifyToken,
  authorizeRoles("user"),
  getFullPatientHistory
);

router.get(
  "/full-history/:patientId",
  verifyToken,
  authorizeRoles("admin", "nurse"),
  getFullPatientHistoryByPatientId
);

export default router;
