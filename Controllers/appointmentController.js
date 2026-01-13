import Appointment from "../Model/Appointment.js";
import UserModel from "../Model/UserModel.js";

/* ================= BOOK APPOINTMENT ================= */
export const bookAppointment = async (req, res) => {
  try {
    const { doctorId, date, timeSlot } = req.body;

     // 🔒 Validate doctor exists & role is doctor
    const doctor = await UserModel.findOne({
      _id: doctorId,
      role: "doctor"
    });

    if (!doctor) {
      return res.status(400).json({
        message: "Invalid doctorId"
      });
    }

    // Prevent overbooking
    const existing = await Appointment.findOne({
      doctorId,
      date,
      timeSlot,
      status: { $in: ["pending", "confirmed"] }
    });

    if (existing) {
      return res.status(400).json({ message: "Slot already booked" });
    }

    // Auto-expiry after 24 hrs
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours


    const appointment = await Appointment.create({
      userId: req.userId,
     doctorId: doctor._id, 
      date,
      timeSlot,
      status: "pending",
      expiresAt
    });

    res.status(201).json({
      message: "Appointment booked (pending)",
      appointment
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================= CONFIRM APPOINTMENT ================= */
export const confirmAppointment = async (req, res) => {
  try {
    if (!["nurse", "doctor", "admin"].includes(req.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const appointment = await Appointment.findById(req.params.id); // ✅ FIXED
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (appointment.status === "cancelled") {
      return res.status(400).json({
        message: "Cancelled appointment cannot be confirmed"
      });
    }

    if (appointment.status === "confirmed") {
      return res.status(400).json({
        message: "Appointment already confirmed"
      });
    }

    if (appointment.expiresAt && appointment.expiresAt < new Date()) {
      appointment.status = "cancelled";
      await appointment.save();
      return res.status(400).json({
        message: "Appointment expired and cancelled"
      });
    }

    appointment.status = "confirmed";
    await appointment.save();

    res.json({
      message: "Appointment confirmed successfully",
      appointment
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================= CANCEL APPOINTMENT ================= */
export const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // ✅ SAFETY CHECK
    if (!appointment.userId) {
      return res.status(400).json({
        message: "This appointment has no user assigned"
      });
    }

    // ✅ USER CAN CANCEL ONLY OWN APPOINTMENT
    if (
      req.role === "user" &&
      appointment.userId.toString() !== req.userId.toString()
    ) {
      return res.status(403).json({
        message: "Users can only cancel their own appointments"
      });
    }

    // ✅ ROLE CHECK
    if (!["user", "nurse", "admin"].includes(req.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    appointment.status = "cancelled";
    await appointment.save();

    res.json({ message: "Appointment cancelled successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* ================= VIEW MY APPOINTMENTS ================= */
export const getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      userId: req.userId // ✅ FIXED
    }).populate("doctorId", "name");

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* ================= VIEW ALL APPOINTMENTS ================= */
export const getAllAppointments = async (req, res) => {
  try {
    // Only nurse or admin can access
    if (!["nurse", "admin"].includes(req.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Fetch all appointments and populate doctor + user names
    const appointments = await Appointment.find()
      .populate("userId", "name email")   // Populate user info
      .populate("doctorId", "name email") // Populate doctor info
      .sort({ date: 1, timeSlot: 1 });   // Optional: sort by date & time

    res.status(200).json({
      message: "All appointments fetched successfully",
      appointments
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch appointments", error: err.message });
  }
};