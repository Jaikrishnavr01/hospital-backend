import mongoose from "mongoose";

const AppointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  date: String,       // YYYY-MM-DD
  timeSlot: String,   // "14:30"

  status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },

  // Booking lock (5 min)
  isLocked: { type: Boolean, default: false },
  lockExpiresAt: Date,

  // Temporary lock after failed/cancel attempts (2 min)
  isTempLocked: { type: Boolean, default: false },
  tempLockExpiresAt: Date,

  reminder24hSent: { type: Boolean, default: false },
  reminder2hSent: { type: Boolean, default: false },

  expiresAt: Date
}, { timestamps: true });

export default mongoose.model("Appointment", AppointmentSchema);
