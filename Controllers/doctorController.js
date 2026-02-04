import DoctorAvailability from "../Model/DoctorAvailability.js";
import Appointment from "../Model/Appointment.js";
import { generateSlots } from "../utils/slotGenerator.js";
import Prescription from "../Model/Prescription.js";
import UserModel from "../Model/UserModel.js";
import Medicine from "../Model/Medicine.js";
import mongoose from "mongoose";

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


export const setDoctorDepartmentAndRegnum = async (req, res) => {
  try {
    const { doctorId, department, registrationNumber } = req.body;

    if (!doctorId || !department) {
      return res.status(400).json({ message: "doctorId and department are required" });
    }
    else if (!registrationNumber) {
      return res.status(400).json({ message: "registrationNumber is required" });
    }

    const doctor = await UserModel.findById(doctorId);

    if (!doctor || doctor.role !== "doctor") {
      return res.status(400).json({ message: "Invalid doctorId" });
    }

    doctor.department = department;
    doctor.registrationNumber = registrationNumber;
    await doctor.save();

    res.json({
      message: "Doctor department updated successfully",
      doctor
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await UserModel.find({ role: "doctor" }).select("name email department");

    res.json({
      count: doctors.length,
      doctors
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

export const getDoctorAvailabilityCalendar = async (req, res) => {
  try {
    const { doctorId } = req.params;
    let { month, year } = req.query;

    if (month === undefined) {
      return res.status(400).json({ message: "Month is required" });
    }

    month = Number(month); // 0-based
    year = year ? Number(year) : 2026;

    const doctorObjectId = new mongoose.Types.ObjectId(doctorId);

    // 🔹 Get all available weekdays for doctor
    const availabilities = await DoctorAvailability.find({
      doctorId: doctorObjectId
    });

    const availableDays = availabilities.map(a => a.day); // ['wed', 'fri']

    const availableDates = [];
    const unavailableDates = [];

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);

      const dayName = dateObj
        .toLocaleDateString("en-US", { weekday: "short" })
        .toLowerCase()
        .slice(0, 3); // mon, tue, wed...

      const formattedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      if (availableDays.includes(dayName)) {
        availableDates.push(formattedDate);
      } else {
        unavailableDates.push(formattedDate);
      }
    }

    return res.status(200).json({
      availableDates,
      unavailableDates
    });

  } catch (err) {
    console.error("Error fetching doctor availability:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const uploadDoctorSignature = async (req, res) => {
  try {
    const loggedInUserId = req.userId;
    const loggedInRole = req.role;
    const targetUserId = req.params.id;

    if (!loggedInUserId || !loggedInRole) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Signature file required"
      });
    }

    let targetUser;

    // 🩺 Doctor → own signature
    if (loggedInRole === "doctor") {
      if (loggedInUserId !== targetUserId) {
        return res.status(403).json({
          message: "Doctors can upload only their own signature"
        });
      }
      targetUser = await UserModel.findById(loggedInUserId);
    }

    // 🛡 Admin → any doctor
    else if (loggedInRole === "admin") {
      targetUser = await UserModel.findById(targetUserId);

      if (!targetUser) {
        return res.status(404).json({ message: "Doctor not found" });
      }

      if (targetUser.role !== "doctor") {
        return res.status(400).json({
          message: "Signature allowed only for doctors"
        });
      }
    }

    else {
      return res.status(403).json({ message: "Access denied" });
    }

    // ✅ NORMALIZE PATH (🔥 important fix)
    const normalizedPath = req.file.path.replace(/\\/g, "/");

    targetUser.signature = normalizedPath;
    await targetUser.save();

    res.json({
      message: "Signature uploaded successfully",
      signature: normalizedPath
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getActiveAppointmentsByDoctor = async (req, res) => {
  try {
    let doctorId;

    if (req.role === "doctor") {
      doctorId = req.userId;
    } else if (req.role === "admin") {
      doctorId = req.params.doctorId;
      if (!doctorId) {
        return res.status(400).json({ message: "doctorId is required" });
      }
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    const today = new Date().toISOString().split("T")[0];

    const appointments = await Appointment.find({
      doctorId,
      date: today,
      status: { $ne: "cancelled" }
    })
      .populate("userId", "name age gender phone")
      .sort({ timeSlot: 1 });

    res.json({
      count: appointments.length,
      appointments
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getUpcomingAppointmentsByDoctor = async (req, res) => {
  try {
    let doctorId;

    if (req.role === "doctor") {
      doctorId = req.userId;
    } else if (req.role === "admin") {
      doctorId = req.params.doctorId;
      if (!doctorId) {
        return res.status(400).json({ message: "doctorId is required" });
      }
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const appointments = await Appointment.find({
      doctorId,
      date: { $gt: today }, // ✅ strictly future dates
      status: { $ne: "cancelled" }
    })
      .populate("userId", "name age gender phone")
      .populate("doctorId", "name department")
      .sort({ date: 1, timeSlot: 1 });

    res.json({
      count: appointments.length,
      appointments
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};






