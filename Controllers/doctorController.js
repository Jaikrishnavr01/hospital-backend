import DoctorAvailability from "../Model/DoctorAvailability.js";
import Appointment from "../Model/Appointment.js";
import { generateSlots } from "../utils/slotGenerator.js";
import Prescription from "../Model/Prescription.js";
import Patient from "../Model/Patient.js";
import UserModel from "../Model/UserModel.js";
import Medicine from "../Model/Medicine.js";

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


export const savePrescription = async (req, res, next) => {
  try {
    const { diagnosis, medicines, advice, followUpDate } = req.body;

    const visitId = req.params.visitId; // <-- automatically picked from URL

    const checkedMedicines = [];

    for (const med of medicines) {
      const storeMed = await Medicine.findOne({ name: med.name });

      if (!storeMed || storeMed.stock < med.qty) {
        checkedMedicines.push({
          name: med.name,
          dosage: med.dosage,
          qty: med.qty,
          duration: med.duration,
          instructions: med.instructions,
          available: false,
          note: "NO STOCK"
        });
      } else {
        checkedMedicines.push({
          name: med.name,
          dosage: med.dosage,
          qty: med.qty,
          duration: med.duration,
          instructions: med.instructions,
          available: true,
          note: "AVAILABLE"
        });
      }
    }

    let prescription = await Prescription.findOne({
      visit: visitId
    });

    if (prescription) {
      prescription.diagnosis = diagnosis;
      prescription.medicines = checkedMedicines;
      prescription.advice = advice;
      prescription.followUpDate = followUpDate;
      prescription.sendToPharmacy = true;
      prescription.dispensed = false;

      await prescription.save();
    } else {
      prescription = await Prescription.create({
        visit: visitId,
        doctor: req.userId,
        patient: req.visit.patient,
        diagnosis,
        medicines: checkedMedicines,
        advice,
        followUpDate,
        sendToPharmacy: true,
        dispensed: false
      });
    }

    req.prescription = prescription;
    next();

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



export const sendPrescriptionToPharmacy = async (req, res) => {
  try {

    res.json({
      message: "Prescription sent to pharmacy successfully",
       prescription: req.prescription
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

