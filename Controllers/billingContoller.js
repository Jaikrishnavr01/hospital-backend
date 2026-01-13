import Bill from "../Model/Bill.js";
import Visit from "../Model/Visit.js";
import User from "../Model/UserModel.js";      // ✅ add this
import Patient from "../Model/Patient.js";     // ✅ add this

export const generateBill = async (req, res) => {
  try {
    const { visitId } = req.body;

    const bill = await Bill.create({
      visit: visitId,
      items: [
        { name: "OP Registration", amount: 100 },
        { name: "Doctor Consultation", amount: 300 }
      ],
      totalAmount: 400
    });

    await Visit.findByIdAndUpdate(visitId, { status: "BILL_GENERATED" });

    res.json({ message: "Bill Generated", billId: bill._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const payBill = async (req, res) => {
  try {
    const { billId, paymentMode } = req.body;

    const bill = await Bill.findByIdAndUpdate(
      billId,
      { status: "PAID", paymentMode },
      { new: true }
    );

    await Visit.findByIdAndUpdate(bill.visit, { status: "PAID" });

    res.json({ message: "Payment Successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get all bills for a user
 * Route: GET /api/op/bills/:userId
 * Roles: admin, nurse, user (user can see only their own bills)
 */
export const getBillsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // 1️⃣ Check user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2️⃣ Get or create patient record
    let patient = await Patient.findOne({ user: user._id });

    if (!patient) {
      patient = await Patient.create({
        user: user._id,
        name: user.name,
        email: user.email
      });
    }

    // 3️⃣ Get all visits for patient
    const visits = await Visit.find({ patient: patient._id });
    const visitIds = visits.map(v => v._id);

    // 4️⃣ Get bills
    const bills = await Bill.find({ visit: { $in: visitIds } })
      .populate({
        path: "visit",
        select: "appointment doctor status"
      });

    res.json({ bills });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

