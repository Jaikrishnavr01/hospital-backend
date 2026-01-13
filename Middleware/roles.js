import UserModel from "../Model/UserModel.js";

/**
 * Generic role authorization middleware
 * Usage: authorizeRoles("admin", "doctor")
 */
const authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      // req.userId must come from verifyToken middleware
          if (!req.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await UserModel.findById(req.userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          message: "Access denied",
          requiredRoles: allowedRoles,
          yourRole: user.role
        });
      }
req.role = user.role;
      next();
    } catch (error) {
      return res.status(500).json({
        message: "Role authorization failed",
        error: error.message
      });
    }
  };
};

/* ===== Role-specific middlewares ===== */
export const isAdmin  = authorizeRoles("admin");
export const isDoctor = authorizeRoles("doctor");
export const isNurse  = authorizeRoles("nurse");
export const isUser   = authorizeRoles("user");

export default authorizeRoles;
