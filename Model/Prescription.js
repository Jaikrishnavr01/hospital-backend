import mongoose from "mongoose";

const prescriptionSchema = new mongoose.Schema({
  visit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Visit",
  },

  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient"
  },

  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  diagnosis: {
    type: String,
    required: true
  },

  medicines: [
    {
      name: {
        type: String,
        required: true
      },
      dosage: {
        type: String,
        required: true // 1-0-1
      },
      duration: {
        type: String,
        required: true // 5 days
      },
      instructions: {
        type: String // after food
      },
      quantity: {
        type: Number
      },
      dispensedQty: {
        type: Number,
        default: 0
      }
    }
  ],

  advice: {
    type: String
  },

  priority: {
    type: String,
    enum: ["LOW", "NORMAL", "HIGH"],
    default: "NORMAL"
  },

  sendToPharmacy: {
    type: Boolean,
    default: false
  },

  dispensed: {
    type: Boolean,
    default: false
  },

  followUpDate: {
    type: Date
  }

}, { timestamps: true });

export default mongoose.model("Prescription", prescriptionSchema);
