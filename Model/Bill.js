import mongoose from "mongoose";

const billSchema = new mongoose.Schema({
  visit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Visit",
    required: true
  },
  items: [{ name: String, amount: Number }],
  totalAmount: { type: Number, required: true },
  paymentMode: { type: String, enum: ["CASH", "CARD", "UPI"] },
  status: { type: String, enum: ["PENDING", "PAID"], default: "PENDING" }
}, { timestamps: true });

export default mongoose.model("Bill", billSchema);
