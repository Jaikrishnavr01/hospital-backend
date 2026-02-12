import DoctorAvailability from "../Model/DoctorAvailability.js";
import Appointment from "../Model/Appointment.js";
import { generateSlots } from "../utils/slotGenerator.js";
import Prescription from "../Model/Prescription.js";
import UserModel from "../Model/UserModel.js";
import Medicine from "../Model/Medicine.js";
import mongoose from "mongoose";
import { to12Hour } from "../Utils/timeFormatter.js";


export const getDoctorSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    const day = new Date(date)
      .toLocaleDateString("en-US", { weekday: "short" })
      .toLowerCase();

    // date override > weekly
    const availability =
      await DoctorAvailability.findOne({ doctorId, date }) ||
      await DoctorAvailability.findOne({ doctorId, day });

    if (!availability) {
      return res.json({ slots: [] });
    }

    // internal 24h slots
    const slots24 = generateSlots(
      availability.startTime,
      availability.endTime,
      availability.slotDuration,
      "24"
    );

    const booked = await Appointment.find({
      doctorId,
      date,
      status: { $in: ["pending", "confirmed"] }
    }).distinct("timeSlot");

    const available24 = slots24.filter(
      s => !booked.includes(s)
    );

    // convert ONLY AVAILABLE slots to 12h
    const available12 = available24.map(slot =>
      generateSlots(slot, slot, 0, "12")[0]
    );

    res.json({
      slots: available12 // AM/PM response
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* DOCTOR / ADMIN: ADD SLOT TIMINGS */
export const addDoctorAvailability = async (req, res) => {
  try {
    let { doctorId, date, day, startTime, endTime, slotDuration } = req.body;

    if (req.role === "doctor") doctorId = req.userId;
    if (!doctorId) return res.status(400).json({ message: "doctorId is required" });

    // Validate doctor
    const doctor = await UserModel.findById(doctorId);
    if (!doctor || doctor.role !== "doctor") return res.status(400).json({ message: "Invalid doctorId" });

    if (!startTime || !endTime || startTime >= endTime)
      return res.status(400).json({ message: "startTime must be before endTime" });

    if (!slotDuration || slotDuration <= 0)
      return res.status(400).json({ message: "Invalid slotDuration" });

    let normalizedDate = null;
    let normalizedDay = null;

    if (date) {
      // Date-specific slot
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) return res.status(400).json({ message: "Invalid date format" });
      normalizedDate = parsedDate.toISOString().split("T")[0];
      normalizedDay = parsedDate.toLocaleString("en-US", { weekday: "short", timeZone: "Asia/Kolkata" }).toLowerCase();

      // Remove any conflicting weekly availability for this day
      await DoctorAvailability.deleteMany({ doctorId, day: normalizedDay, date: null });

      // Prevent duplicate date-specific
      const existingDate = await DoctorAvailability.findOne({ doctorId, date: normalizedDate });
      if (existingDate) return res.status(400).json({ message: "Availability already exists for this date" });

    } else if (day) {
      // Weekly slot
      normalizedDay = day.toLowerCase();
      if (!["mon","tue","wed","thu","fri","sat","sun"].includes(normalizedDay))
        return res.status(400).json({ message: "Invalid day value" });

      // Prevent duplicate weekly
      const existingDay = await DoctorAvailability.findOne({ doctorId, day: normalizedDay, date: null });
      if (existingDay) return res.status(400).json({ message: "Availability already exists for this day" });

    } else {
      return res.status(400).json({ message: "Either date or day is required" });
    }

    // Create availability
    const availability = await DoctorAvailability.create({
      doctorId,
      date: normalizedDate,
      day: normalizedDay,
      startTime,
      endTime,
      slotDuration
    });

    res.status(201).json({ message: "Doctor availability added successfully", availability });

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

    // console.log("===== DEBUG START =====");
    // console.log("VISIT ID:", visit._id);
    // console.log("VISIT OBJECT:", visit);
    // console.log("VISIT APPOINTMENT FIELD:", visit.appointment);

    // Check if appointment exists
    const appointment = await Appointment.findById(visit.appointment);

    // console.log("FOUND APPOINTMENT:", appointment);

    if (!appointment) {
      console.log("❌ NO APPOINTMENT FOUND");
      return next();
    }

    appointment.status = "completed";
    await appointment.save();

    // console.log("✅ APPOINTMENT UPDATED SUCCESSFULLY");

    visit.status = "CONSULTED";
    await visit.save();

    // console.log("===== DEBUG END =====");

    next();

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
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

    month = Number(month); // JS 0-based month
    year = year ? Number(year) : 2026;

    const doctorObjectId = new mongoose.Types.ObjectId(doctorId);

    // 🔹 Get all availability records for the doctor
    const availabilities = await DoctorAvailability.find({
      doctorId: doctorObjectId
    });

    // Separate weekly vs daily
    const weeklyDays = availabilities
      .filter(a => !a.date) // no specific date → weekly
      .map(a => a.day.toLowerCase().slice(0, 3)); // ['mon', 'wed']

    const dailyDates = availabilities
      .filter(a => a.date) // specific dates → daily
      .map(a => {
        const d = new Date(a.date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      });

    const availableDates = [];
    const unavailableDates = [];

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);

      const formattedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayName = dateObj
        .toLocaleDateString("en-US", { weekday: "short" })
        .toLowerCase()
        .slice(0, 3); // mon, tue, wed...

      // ✅ Daily has higher priority
      if (dailyDates.includes(formattedDate)) {
        availableDates.push(formattedDate);
      } else if (weeklyDays.includes(dayName)) {
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

    // 🔥 ADD 12-hour slot (non-breaking)
    const formatted = appointments.map(a => ({
      ...a.toObject(),
      timeSlot12: to12Hour(a.timeSlot)
    }));

    res.json({
      count: formatted.length,
      appointments: formatted
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

    const today = new Date().toISOString().split("T")[0];

    const appointments = await Appointment.find({
      doctorId,
      date: { $gt: today },
      status: { $ne: "cancelled" }
    })
      .populate("userId", "name age gender phone")
      .populate("doctorId", "name department")
      .sort({ date: 1, timeSlot: 1 });

    // 🔥 ADD 12-hour slot (non-breaking)
    const formatted = appointments.map(a => ({
      ...a.toObject(),
      timeSlot12: to12Hour(a.timeSlot)
    }));

    res.json({
      count: formatted.length,
      appointments: formatted
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



