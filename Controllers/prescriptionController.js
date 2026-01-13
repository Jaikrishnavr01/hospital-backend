import Prescription from "../Model/Prescription.js";

export const getEPrescriptionByVisit = async (req, res) => {
  try {
    const { visitId } = req.params;

    const prescription = await Prescription.findOne({ visit: visitId })
      .populate({
        path: "doctor",
        select: "name email"
      })
      .populate({
        path: "patient",
        select: "name age gender phone"
      })
      .populate({
        path: "visit",
        select: "status createdAt"
      });

    if (!prescription) {
      return res.status(404).json({
        message: "E-Prescription not found"
      });
    }

    res.json(prescription);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
