import Patient from "../Model/Patient.js";
import Visit from "../Model/Visit.js";
import Appointment from "../Model/Appointment.js";
import Prescription from "../Model/Prescription.js";
import DoctorAvailability from "../Model/DoctorAvailability.js";

/**
 * USER → OWN FULL PATIENT HISTORY
 * GET /api/patient/full-history
 */
export const getFullPatientHistory = async (req, res) => {
  try {
 const userId = req.userId;
    // 1️⃣ Patient linked to logged-in user
    const patient = await Patient.findOne({ user: userId })
      .populate("user", "name email");

    if (!patient) {
      return res.status(404).json({ message: "Patient record not found" });
    }

    // 2️⃣ Visits
    const visits = await Visit.find({ patient: patient._id })
      .populate("doctor", "name email")
      .sort({ createdAt: -1 });

    const visitIds = visits.map(v => v._id);

    // 3️⃣ Appointments
    const appointments = await Appointment.find({ userId })
      .populate("doctorId", "name email")
      .sort({ date: -1 });

    // 4️⃣ Prescriptions
    const prescriptions = await Prescription.find({
      visit: { $in: visitIds }
    })
      .populate({
        path: "visit",
        populate: { path: "doctor", select: "name email" }
      });

    res.json({
      patient,
      appointmentHistory: appointments,
      visits,
      prescriptions
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


export const getFullPatientHistoryByPatientId = async (req, res) => {
  try {
    const { patientId } = req.params;

    // 1️⃣ Patient
    const patient = await Patient.findById(patientId)
      .populate("user", "name email");

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // 2️⃣ Visits
    const visits = await Visit.find({ patient: patient._id })
      .populate("doctor", "name email")
      .sort({ createdAt: -1 });

    const visitIds = visits.map(v => v._id);

    // 3️⃣ Appointments
    const appointments = await Appointment.find({
      userId: patient.user._id
    })
      .populate("doctorId", "name email")
      .sort({ date: -1 });

    // 4️⃣ Prescriptions
    const prescriptions = await Prescription.find({
      visit: { $in: visitIds }
    })
      .populate({
        path: "visit",
        populate: { path: "doctor", select: "name email" }
      });

    res.json({
      patient,
      appointmentHistory: appointments,
      visits,
      prescriptions
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


export const getFullHistoryByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const patientId = appointment.patientId;

    const visits = await Visit.find({ patientId })
      .select("_id appointment patient doctor userId") // ✅ ONLY THESE
      .sort({ createdAt: -1 });

   // res.json(visits); 
   
    const result = visits.map(v => ({
  _id: v._id,
  appointment: v.appointment,
  patient: v.patient,
  doctor: v.doctor,
  userId: appointment.userId, // ✅ from appointment
}));

res.json(result);

  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ error: err.message });
  }
};