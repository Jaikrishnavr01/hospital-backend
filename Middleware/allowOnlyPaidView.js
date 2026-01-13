import Visit from "../Model/Visit.js";

const allowOnlyPaidVisit = async (req, res, next) => {
  try {
    const { visitId } = req.body;

    if (!visitId) {
      return res.status(400).json({ message: "visitId is required" });
    }

    const visit = await Visit.findById(visitId);
    if (!visit) {
      return res.status(404).json({ message: "Visit not found" });
    }

    // ✅ allow PAID and CONSULTED
    if (!["PAID", "CONSULTED"].includes(visit.status)) {
      return res.status(403).json({
        message: "Billing not completed. Doctor access denied."
      });
    }

    req.visit = visit;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export default allowOnlyPaidVisit;
