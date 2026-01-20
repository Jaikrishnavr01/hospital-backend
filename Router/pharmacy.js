import verifyToken from "../Middleware/verifyToken.js";
import authorizeRoles from "../Middleware/roles.js";
import { addMedicine, dispenseAndBill, dispensePartial, expiryAlerts, getAllPharmacyPrescriptions, payPharmacyBill, scanMedicineByBarcode, stockAlerts } from '../Controllers/prescriptionController.js'
import express from "express"

const router = express.Router();

router.get(
  "/pharmacy/prescriptions",
  verifyToken,
  authorizeRoles("pharmacist", "admin"),
  getAllPharmacyPrescriptions
);

router.get(
  "/pharmacy/medicine/scan/:barcode",
  verifyToken,
  authorizeRoles("pharmacist", "admin"),
  scanMedicineByBarcode
);

router.post(
  "/pharmacy/dispense/:prescriptionId",
  verifyToken,
  authorizeRoles("pharmacist", "admin"),
  dispenseAndBill,
  dispensePartial
);

router.post(
  "/pharmacy/pay/:billId",
  verifyToken,
  authorizeRoles("pharmacist", "admin"),
  payPharmacyBill
);

router.get(
  "/pharmacy/stock-alerts",
  verifyToken,
  authorizeRoles("pharmacist", "admin"),
  stockAlerts
);

router.post(
  "/pharmacy/medicine/add",
  verifyToken,
  authorizeRoles("pharmacist", "admin"),
  addMedicine
);

router.get(
  "/pharmacy/expiry-alerts",
  verifyToken,
  authorizeRoles("pharmacist", "admin"),
  expiryAlerts
);

export default router;
