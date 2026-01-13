import DoctorAvailability from "../Model/DoctorAvailability.js";
import Appointment from "../Model/Appointment.js";
import { generateSlots } from "../utils/slotGenerator.js";
import Prescription from "../Model/Prescription.js";
import Patient from "../Model/Patient.js";
import UserModel from "../Model/UserModel.js";

export const getDoctorSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({ message: "doctorId and date required" });
    }

    const day = new Date(date)
      .toLocaleDateString("en-US", { weekday: "short" })
      .toLowerCase();

    const availability = await DoctorAvailability.findOne({ doctorId, day });
    if (!availability) return res.json([]);

    const allSlots = generateSlots(
      availability.startTime,
      availability.endTime,
      availability.slotDuration
    );

    const booked = await Appointment.find({
      doctorId,
      date,
      status: { $ne: "cancelled" }
    });

    const bookedSlots = booked.map(b => b.timeSlot);
    const availableSlots = allSlots.filter(
      slot => !bookedSlots.includes(slot)
    );

    res.json(availableSlots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* DOCTOR / ADMIN: ADD SLOT TIMINGS */
export const addDoctorAvailability = async (req, res) => {
  try {
    let { doctorId, day, startTime, endTime, slotDuration } = req.body;

    // Normalize day
    day = day?.toLowerCase().slice(0, 3);

    const validDays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    if (!validDays.includes(day)) {
      return res.status(400).json({ message: "Invalid day" });
    }

    // Doctor adds only for self
    if (req.role === "doctor") {
      doctorId = req.userId;
    }

    // Admin must pass doctorId
    if (!doctorId) {
      return res.status(400).json({ message: "doctorId is required" });
    }

    // Validate doctor exists
    const doctor = await UserModel.findById(doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(400).json({ message: "Invalid doctorId" });
    }

    // Time validation
    if (startTime >= endTime) {
      return res.status(400).json({
        message: "startTime must be before endTime"
      });
    }

    if (!slotDuration || slotDuration <= 0) {
      return res.status(400).json({
        message: "Invalid slotDuration"
      });
    }

    // Prevent duplicate availability
    const existing = await DoctorAvailability.findOne({ doctorId, day });
    if (existing) {
      return res.status(400).json({
        message: "Availability already exists for this day"
      });
    }

    const availability = await DoctorAvailability.create({
      doctorId,
      day,
      startTime,
      endTime,
      slotDuration
    });

    res.status(201).json({
      message: "Slot timings added successfully",
      availability
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// consultation 
export const startConsultation = async (req, res, next) => {
  try {
    const visit = req.visit;

    // Already started → skip
    if (visit.status === "CONSULTED") {
      return next();
    }

    visit.status = "CONSULTED";
    await visit.save();

    next(); // ✅ VERY IMPORTANT
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


export const savePrescription = async (req, res) => {
  try {
    const visit = req.visit;
    const doctorId = req.userId;

    if (visit.status !== "CONSULTED") {
      return res.status(403).json({
        message: "Prescription allowed only after consultation"
      });
    }

    const existing = await Prescription.findOne({ visit: visit._id });
    if (existing) {
      return res.status(400).json({
        message: "Prescription already exists"
      });
    }

    const { diagnosis, medicines, advice, followUpDate } = req.body;

    const patient = await Patient.findById(visit.patient);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    await Prescription.create({
      visit: visit._id,
      doctor: doctorId,
      patient: patient._id,
      diagnosis,
      medicines,
      advice,
      followUpDate
    });

    // ✅ FINAL STATUS
    visit.status = "COMPLETED";
    await visit.save();

    res.status(201).json({
      message: "Consultation completed & E-Prescription saved",
      visitStatus: visit.status
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};




