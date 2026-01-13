import mongoose from "mongoose";

const prescriptionSchema = new mongoose.Schema({
  visit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Visit",
    required: true,
    unique: true
  },

  diagnosis: {
    type: String,
    required: true
  },

  medicines: [
    {
      name: { type: String, required: true },
      dosage: { type: String, required: true },     // 1-0-1
      duration: { type: String, required: true },   // 5 days
      instructions: { type: String }                // after food
    }
  ],

  advice: {
    type: String
  },

  followUpDate: {
    type: Date
  }

}, { timestamps: true });

export default mongoose.model("Prescription", prescriptionSchema);
