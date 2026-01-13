import mongoose from "mongoose";

const visitSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Appointment",
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  vitals: {
    height: { type: String, required: true },
    weight: { type: String, required: true },
    bp: { type: String, required: true },
    pulse: { type: String, required: true },
    temperature: { type: String, required: true },
    spo2: { type: String, required: true }
  },

  status: {
    type: String,
    enum: ["OP_REGISTERED", "BILL_GENERATED", "PAID", "CONSULTED", "COMPLETED"],
    default: "OP_REGISTERED"
  }
}, { timestamps: true });

export default mongoose.model("Visit", visitSchema);
