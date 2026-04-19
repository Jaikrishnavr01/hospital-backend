import mongoose from "mongoose";

const billSchema = new mongoose.Schema(
  {
    visit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visit",
      required: true,
    },

    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

       prescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prescription",
    },

    doctorId: {
       type: mongoose.Schema.Types.ObjectId,
       ref: "User",
     },

    items: [
      {
        name: String,
        amount: Number,
      },
    ],

    totalAmount: {
      type: Number,
      required: true,
    },

    paymentMode: {
      type: String,
      enum: ["CASH", "CARD", "UPI"],
    },

    status: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Bill", billSchema);