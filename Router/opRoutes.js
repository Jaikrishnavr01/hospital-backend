import express from "express";
import verifyToken from "../Middleware/verifyToken.js";
import authorizeRoles from "../Middleware/roles.js";
import { getPatientIdsByUserId, registerOpAndGenerateBill } from "../Controllers/registerOpAndGenerateBill .js";
import { generateBill, getBillsByUser, payBill } from "../Controllers/billingContoller.js";

const router = express.Router();

router.post(
"/register",
  verifyToken,
  authorizeRoles("admin", "nurse"),
  registerOpAndGenerateBill
);

router.get("/patient/me", 
  verifyToken, 
  getPatientIdsByUserId
);


router.post(
  "/bill/generate",
  verifyToken,
  authorizeRoles("admin", "nurse"),
  generateBill
);

router.post(
  "/bill/pay",
  verifyToken,
  authorizeRoles("admin", "nurse"),
  payBill
);

router.get(
  "/bills/:userId",
  verifyToken,
  authorizeRoles("admin", "nurse", "user"),
  getBillsByUser
);

export default router;
