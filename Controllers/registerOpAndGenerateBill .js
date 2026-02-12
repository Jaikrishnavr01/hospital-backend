import mongoose from "mongoose";
import User from "../Model/UserModel.js";
import Patient from "../Model/Patient.js";
import Visit from "../Model/Visit.js";
import Bill from "../Model/Bill.js";
import Appointment from "../Model/Appointment.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import Prescription from "../Model/Prescription.js";

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
      user = await User.findOne({ email });
      if (!user) {
        const tempPassword = "password123";
        user = await User.create({
          name,
          email,
          password: await bcrypt.hash(tempPassword, 10),
          role: "user",
          isActivated: true
        });
      }
    }

    /* ================= PATIENT ================= */
    let patient = await Patient.findOne({
      user: user._id,
      name: name.trim()
    });

    if (patient) {
      // Update existing patient
      patient.age = age;
      patient.gender = gender;
      patient.phone = phone;
      patient.email = email;
      patient.address = address;
      patient.bloodGroup = bloodGroup;
      patient.emergencyContact = emergencyContact;
      patient.vitals = vitals;

      await patient.save();
    } else {
      // Create new patient
      patient = await Patient.create({
        user: user._id,
        name,
        age,
        gender,
        phone,
        email,
        address,
        bloodGroup,
        emergencyContact,
        vitals
      });
    }

    /* ================= FIRST VISIT ================= */
    const previousVisits = await Visit.countDocuments({
      patient: patient._id
    });
    isFirstVisit = previousVisits === 0;

    /* ================= APPOINTMENT ================= */
    let appointment;
    if (mongoose.Types.ObjectId.isValid(appointmentId)) {
      appointment = await Appointment.findById(appointmentId);
    } else {
      appointment = await Appointment.findOne({ code: appointmentId });
    }

    if (!appointment) {
      return res.status(404).json({ message: `Appointment ${appointmentId} not found` });
    }

    /* ================= DOCTOR ================= */
    let doctor;
    if (mongoose.Types.ObjectId.isValid(doctorId)) {
      doctor = await User.findById(doctorId);
    } else {
      doctor = await User.findOne({ customId: doctorId, role: "doctor" });
    }

    if (!doctor) {
      return res.status(404).json({ message: `Doctor ${doctorId} not found` });
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
    if (isFirstVisit) {
      items.push({ name: "OP Registration", amount: 100 });
    }
    items.push({ name: "Doctor Consultation", amount: 300 });

    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    const bill = await Bill.create({
      visit: visit._id,
      items,
      totalAmount,
      status: "PENDING"
    });

    visit.status = "BILL_GENERATED";
    await visit.save();

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

  } catch (err) {
    console.error("REGISTER OP ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};


// export const getPatientByUserId = async (req, res) => {
//   try {
//     const patient = await Patient.findOne({ user: req.user.id });

//     if (!patient) {
//       return res.status(404).json({
//         message: "Patient profile not created yet"
//       });
//     }

//     return res.status(200).json({
//       patientId: patient._id,
//       patient
//     });
//   } catch (error) {
//     console.error("GET PATIENT ERROR:", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// };


/**
 * Get all patients for the logged-in user
 */
export const getPatientIdsByUserId = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User ID missing" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    /* ================= PATIENTS ================= */
    const patients = await Patient.find({ user: userId }).lean();

    if (!patients || patients.length === 0) {
      return res.status(200).json({
        count: 0,
        patientIds: [],
        patients: []
      });
    }

    const patientIds = patients.map(p => p._id);

    /* ================= VISITS ================= */
    const visits = await Visit.find({
      patient: { $in: patientIds }
    })
      .populate("doctor", "name email department signature")
      .lean();

    /* ================= PRESCRIPTIONS ================= */
const prescriptions = await Prescription.find({
  patient: { $in: patientIds }
})
  .populate({
    path: "medicines",
    select: "name dosage duration signature"
  })
  .populate("doctor", "name email department")
  .populate("visit")
  .lean();


    /* ================= MERGE DATA ================= */
    const patientsWithData = patients.map(patient => ({
      ...patient,
      visits: visits.filter(
        v => v.patient.toString() === patient._id.toString()
      ),
      prescriptions: prescriptions.filter(
        p => p.patient.toString() === patient._id.toString()
      )
    }));

    return res.status(200).json({
      count: patientsWithData.length,
      patientIds,
      patients: patientsWithData
    });

  } catch (error) {
    console.error("GET PATIENT IDS ERROR:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};



export const getVisit = async (req, res, next) => {
  try {
    const visit = await Visit.findById(req.params.visitId);

    if (!visit) {
      return res.status(404).json({ message: "Visit not found" });
    }

    req.visit = visit; // IMPORTANT

    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
