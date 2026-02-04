import { getHospitalInfo, updateHospitalInfo } from "../Controllers/hospitalController.js";
import authorizeRoles from "../Middleware/roles.js";
import express from "express";
import verifyToken from "../Middleware/verifyToken.js";

const router = express.Router();

router.get("/", getHospitalInfo);

router.post(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  updateHospitalInfo
);

export default router;