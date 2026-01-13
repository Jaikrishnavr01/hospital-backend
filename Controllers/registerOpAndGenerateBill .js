import mongoose from "mongoose";
import User from "../Model/UserModel.js";
import Patient from "../Model/Patient.js";
import Visit from "../Model/Visit.js";
import Bill from "../Model/Bill.js";
import Appointment from "../Model/Appointment.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const registerOpAndGenerateBill = async (req, res) => {
  try {
    const {
      appointmentId,
      doctorId,
      userId,

      name,
      age,
      gender,
      phone,
      email,
      address,
      bloodGroup,
      emergencyContact,
      vitals
    } = req.body;

    let user;
    let isFirstVisit = false;

    /* ================= USER ================= */
    if (userId) {
      user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
    } else {
      const tempPassword = crypto.randomBytes(4).toString("hex");
      user = await User.create({
        name,
        email,
        password: await bcrypt.hash(tempPassword, 10),
        role: "user"
      });
    }

    /* ================= PATIENT ================= */
    let patient = await Patient.findOne({ user: user._id });

    if (!patient) {
      isFirstVisit = true;
      patient = await Patient.create({
        user: user._id,
        name,
        age,
        gender,
        phone,
        email,
        address,
        bloodGroup,
        emergencyContact
      });
    }

    const previousVisits = await Visit.countDocuments({ patient: patient._id });
    if (previousVisits === 0) isFirstVisit = true;

    /* ================= APPOINTMENT RESOLUTION ================= */
    let appointment;

    if (mongoose.Types.ObjectId.isValid(appointmentId)) {
      appointment = await Appointment.findById(appointmentId);
    } else {
      appointment = await Appointment.findOne({ code: appointmentId });
    }

    if (!appointment) {
      return res.status(404).json({
        message: `Appointment ${appointmentId} not found`
      });
    }

    /* ================= DOCTOR RESOLUTION ================= */
    let doctor;

    if (mongoose.Types.ObjectId.isValid(doctorId)) {
      doctor = await User.findById(doctorId);
    } else {
      doctor = await User.findOne({ customId: doctorId, role: "doctor" });
    }

    if (!doctor) {
      return res.status(404).json({
        message: `Doctor ${doctorId} not found`
      });
    }

    /* ================= VISIT ================= */
    const visit = await Visit.create({
      appointment: appointment._id,
      doctor: doctor._id,
      patient: patient._id,
      vitals,
      status: "OP_REGISTERED"
    });

    /* ================= BILL ================= */
    const items = [];
    if (isFirstVisit) items.push({ name: "OP Registration", amount: 100 });
    items.push({ name: "Doctor Consultation", amount: 300 });

    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

    const bill = await Bill.create({
      visit: visit._id,
      items,
      totalAmount,
      status: "PENDING"
    });

    visit.status = "BILL_GENERATED";
    

    /* ================= RESPONSE ================= */
    res.status(201).json({
      message: "OP registered & bill generated",
      firstVisit: isFirstVisit,
      userId: user._id,
      patientId: patient._id,
      visitId: visit._id,
      billId: bill._id,
      totalAmount
    });
    
    await visit.save();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }

};
