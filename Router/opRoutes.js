import express from "express";
import verifyToken from "../Middleware/verifyToken.js";
import authorizeRoles from "../Middleware/roles.js";
import { getPatientIdsByUserId, registerOpAndGenerateBill } from "../Controllers/registerOpAndGenerateBill .js";
import { generateBill, getAllBills, getBillsByUser, getPendingBills, payBill } from "../Controllers/billingContoller.js";

const router = express.Router();

router.post(
"/register",
  verifyToken,
  authorizeRoles("admin", "nurse", "doctor"),
  registerOpAndGenerateBill
);


router.put(
  "/register",
  verifyToken,
  authorizeRoles("admin", "nurse", "doctor"),
  registerOpAndGenerateBill
);

router.get("/patient/me", 
  verifyToken, 
  getPatientIdsByUserId
);


router.post(
  "/bill/generate",
  verifyToken,
  authorizeRoles("admin", "nurse", "doctor"),
  generateBill
);

router.post(
  "/bill/pay",
  verifyToken,
  authorizeRoles("admin", "nurse", "doctor"),
  payBill
);

/* ================================
   ✅ ADMIN / NURSE
================================ */

// All bills
router.get(
  "/all",
  verifyToken,
  authorizeRoles("admin", "nurse"),
  getAllBills
);

// Pending bills
router.get(
  "/pending",
  verifyToken,
  authorizeRoles("admin", "nurse"),
  getPendingBills
);

/* ================================
   ✅ USER - OWN BILLS ONLY
================================ */

router.get(
  "/my",
  verifyToken,
  authorizeRoles("user"),
  getBillsByUser
);

/* ================================
   ✅ ADMIN / NURSE / DOCTOR - ANY USER
================================ */

router.get(
  "/user/:userId",
  verifyToken,
  authorizeRoles("admin", "nurse", "doctor"),
  getBillsByUser
);



export default router;
