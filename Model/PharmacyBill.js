import mongoose from "mongoose";

const pharmacyBillSchema = new mongoose.Schema({
  prescription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Prescription",
    required: true
  },
  items: [
    {
      medicine: {
        type: String,          // <-- Changed to String
        required: true
      },
      qty: {
        type: Number,
        required: true
      },
      price: {
        type: Number,
        required: true
      },
      total: {
        type: Number,
        required: true
      }
    }
  ],
  totalAmount: {
    type: Number,
    required: true
  },
  paymentMode: {
    type: String,
    enum: ["cash", "card", "upi"],
    default: "cash"
  },
  status: {
    type: String,
    enum: ["PENDING", "PAID"],
    default: "PENDING"
  }
}, { timestamps: true });

export default mongoose.model("PharmacyBill", pharmacyBillSchema);
