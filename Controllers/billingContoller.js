import Bill from "../Model/Bill.js";
import Visit from "../Model/Visit.js";
import User from "../Model/UserModel.js";
import Patient from "../Model/Patient.js";

// ✅ IMPORTANT: Force model registration (FIXES "Doctor not registered" error)
import "../Model/DoctorAvailability.js";
import "../Model/Appointment.js";

/* ================================
   ✅ GENERATE BILL
================================ */
export const generateBill = async (req, res) => {
  try {
    const { visitId } = req.body;

    if (!visitId) {
      return res.status(400).json({ message: "visitId is required" });
    }

    // Get visit with relations
    const visit = await Visit.findById(visitId)
      .populate({
        path: "patient",
        populate: { path: "user" },
      })
      .populate("appointment");

    if (!visit) {
      return res.status(404).json({ message: "Visit not found" });
    }

    const userId = visit.patient?.user?._id || visit.patient?.user || null;
    const doctorId = visit.appointment?.doctorId || null;
    const appointmentId = visit.appointment?._id || null;

    // Prevent duplicate bill
    const existing = await Bill.findOne({ visit: visitId });
    if (existing) {
      return res.status(400).json({ message: "Bill already exists" });
    }

    const bill = await Bill.create({
      visit: visitId,
      appointmentId,
      userId,
      doctorId,
      items: [
        { name: "OP Registration", amount: 100 },
        { name: "Doctor Consultation", amount: 300 },
      ],
      totalAmount: 400,
      status: "PENDING",
    });

    await Visit.findByIdAndUpdate(visitId, {
      status: "BILL_GENERATED",
    });

    res.status(201).json({
      message: "Bill Generated Successfully",
      bill,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================================
   ✅ PAY BILL
================================ */
export const payBill = async (req, res) => {
  try {
    const { billId, paymentMode } = req.body;

    if (!billId || !paymentMode) {
      return res.status(400).json({ message: "billId & paymentMode required" });
    }

    const bill = await Bill.findById(billId);

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    bill.status = "PAID";
    bill.paymentMode = paymentMode;

    await bill.save();

    if (bill.visit) {
      await Visit.findByIdAndUpdate(bill.visit, {
        status: "PAID",
      });
    }

    res.json({
      message: "Payment Successful",
      bill,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================================
   ✅ GET ALL BILLS
================================ */
export const getAllBills = async (req, res) => {
  try {
    const bills = await Bill.find({})
      .populate("userId", "name email")
      .populate("doctorId", "name email")
      .populate("appointmentId", "date timeSlot");

    // console.log("TOTAL BILLS:", bills.length);

    res.json({
      message: "All bills fetched successfully",
      count: bills.length,
      bills,
    });
  } catch (err) {
    console.error("GET ALL BILLS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ================================
   ✅ GET PENDING BILLS
================================ */
export const getPendingBills = async (req, res) => {
  try {
    const bills = await Bill.find({ status: "PENDING" })
      .populate("userId", "name email")
      .populate("doctorId", "name email")
      .populate("appointmentId", "date timeSlot")
      .populate("visit");

    res.json({
      message: "Pending bills fetched successfully",
      bills,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ================================
   ✅ GET BILLS BY USER
================================ */
export const getBillsByUser = async (req, res) => {
  try {
    let userId;

    if (req.user.role === "user") {
      userId = req.user.id;
    } else {
      userId = req.params.userId;
    }

    const bills = await Bill.find({ userId })
      .populate("doctorId", "name email")
      .populate("appointmentId", "date timeSlot")
      .populate("visit");

    res.json({
      message: "Bills fetched successfully",
      bills,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};