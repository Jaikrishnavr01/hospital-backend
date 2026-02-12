import Appointment from "../Model/Appointment.js";
import DoctorAvailability from "../Model/DoctorAvailability.js"; 

// ================= REQUEST / BOOK APPOINTMENT =================
export const requestAppointment = async (req, res) => {
  try {
    const { doctorId, date, timeSlot } = req.body;

    if (req.role !== "user") {
      return res.status(403).json({ message: "Only patients can request appointments" });
    }

    if (!doctorId || !date || !timeSlot) {
      return res.status(400).json({ message: "doctorId, date and timeSlot are required" });
    }

    // normalize date string
    const normalizedDate = new Date(date).toISOString().split("T")[0];
    const dayOfWeek = new Date(date).toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();

    // Step 1: Check existing appointment
    let appointment = await Appointment.findOne({
      doctorId,
      date: normalizedDate,
      timeSlot,
      status: { $in: ["pending", "confirmed"] }
    });

    if (appointment) {
      if (appointment.isTempLocked && appointment.tempLockExpiresAt < new Date()) {
        appointment.isTempLocked = false;
        appointment.tempLockExpiresAt = null;
        await appointment.save();
      }
      if (appointment.isTempLocked)
        return res.status(400).json({ message: "Slot temporarily unavailable, try later" });
      if (appointment.isLocked && appointment.lockExpiresAt > new Date())
        return res.status(400).json({ message: "Slot is currently locked, try later" });
    }

    // Step 2: Find availability

    // 2a) Check date-specific first
    let availability = await DoctorAvailability.findOne({
      doctorId,
      date: normalizedDate,
      startTime: { $lte: timeSlot },
      endTime: { $gte: timeSlot }
    });

    // 2b) If no date-specific, fallback to weekly
    if (!availability) {
      availability = await DoctorAvailability.findOne({
        doctorId,
        date: null, // weekly
        day: dayOfWeek,
        startTime: { $lte: timeSlot },
        endTime: { $gte: timeSlot }
      });
    }

    if (!availability) return res.status(400).json({ message: "Slot not available" });

    // Step 3: Create appointment if not exists
    if (!appointment) {
      appointment = await Appointment.create({
        doctorId,
        date: normalizedDate,
        timeSlot,
        status: "pending"
      });
    }

    // Step 4: Lock appointment
// Lock for 24 hours
appointment.isLocked = true;
appointment.lockExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours in ms

// Temporary lock for 24 hours as well
appointment.isTempLocked = true;
appointment.tempLockExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours in ms


    appointment.userId = req.userId;
    await appointment.save();

    return res.json({
      message: "Appointment requested successfully, pending confirmation",
      appointment
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

// ================= CONFIRM APPOINTMENT =================
export const confirmAppointment = async (req, res) => {
  try {
    if (!["nurse", "doctor", "admin"].includes(req.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    if (appointment.status === "cancelled")
      return res.status(400).json({ message: "Cancelled appointment cannot be confirmed" });

    if (appointment.status === "confirmed")
      return res.status(400).json({ message: "Appointment already confirmed" });

    if (appointment.expiresAt && appointment.expiresAt < new Date()) {
      appointment.status = "cancelled";
      await appointment.save();
      return res.status(400).json({ message: "Appointment expired and cancelled" });
    }

    appointment.status = "confirmed";
    appointment.isLocked = false;
    appointment.lockExpiresAt = null;
    appointment.isTempLocked = false;
    appointment.tempLockExpiresAt = null;

    await appointment.save();

    res.json({ message: "Appointment confirmed successfully", appointment });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= CANCEL APPOINTMENT =================
export const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    if (req.role === "user" && appointment.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: "Users can only cancel their own appointments" });
    }

    if (!["user", "nurse", "admin"].includes(req.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Cancel and set temp lock 2 min
    appointment.status = "cancelled";
    appointment.isLocked = false;
    appointment.lockExpiresAt = null;

    appointment.isTempLocked = true;
    appointment.tempLockExpiresAt = new Date(Date.now() + 2 * 60 * 1000);

    await appointment.save();

    res.json({ message: "Appointment cancelled successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= VIEW MY APPOINTMENTS =================
export const getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ userId: req.userId })
      .populate("doctorId", "name email")
      .sort({ date: 1, timeSlot: 1 });

    res.json(appointments);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ================= VIEW ALL APPOINTMENTS =================
export const getAllAppointments = async (req, res) => {
  try {
    if (!["nurse", "admin", "doctor", "user"].includes(req.role))
      return res.status(403).json({ message: "Access denied" });

    const appointments = await Appointment.find()
      .populate("userId", "name email")
      .populate("doctorId", "name email")
      .sort({ date: 1, timeSlot: 1 });

    res.json({ message: "All appointments fetched successfully", appointments });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= GET TIME SLOTS FOR FRONTEND =================
export const getTimeSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query; // <-- get date from query, NOT body

    if (!doctorId || !date) {
      return res.status(400).json({ message: "doctorId and date required" });
    }

    // Normalize date
    const normalizedDate = new Date(date).toISOString().split("T")[0];
    const dayOfWeek = new Date(date)
      .toLocaleDateString("en-US", { weekday: "short" })
      .toLowerCase();

    // 1️⃣ Try to get date-specific availability
    let availability = await DoctorAvailability.findOne({
      doctorId,
      date: normalizedDate
    });

    // 2️⃣ If no date-specific, fallback to weekly
    if (!availability) {
      availability = await DoctorAvailability.findOne({
        doctorId,
        date: null,
        day: dayOfWeek
      });
    }

    if (!availability) {
      return res.status(400).json({ message: "No availability found" });
    }

    const { startTime, endTime, slotDuration } = availability;

    // Generate time slots
    const slots = [];
    let current = startTime.split(":").map(Number); // [hour, min]
    const [endHour, endMin] = endTime.split(":").map(Number);

    while (
      current[0] < endHour ||
      (current[0] === endHour && current[1] < endMin)
    ) {
      slots.push(`${String(current[0]).padStart(2, "0")}:${String(current[1]).padStart(2, "0")}`);
      current[1] += slotDuration;
      if (current[1] >= 60) {
        current[0] += Math.floor(current[1] / 60);
        current[1] = current[1] % 60;
      }
    }

    // Exclude already booked slots
    const bookedAppointments = await Appointment.find({
      doctorId,
      date: normalizedDate,
      status: { $in: ["pending", "confirmed"] }
    });

    const bookedTimes = bookedAppointments.map(a => a.timeSlot.trim());

    const availableSlots = slots.filter(s => !bookedTimes.includes(s));

    res.json({ timeSlots: availableSlots });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};