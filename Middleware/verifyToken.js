import jwt from "jsonwebtoken";
import UserModel from "../Model/UserModel.js";

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Must match your JWT payload
    req.userId = decoded.userId;
    req.role = decoded.role;

    const user = await UserModel.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    next();
  } catch (error) {
    console.error("JWT Verification Error:", error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default verifyToken;
