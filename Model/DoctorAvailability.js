import mongoose from "mongoose";

const availabilitySchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  day: {
    type: String,
    enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
  },
  startTime: String,
  endTime: String,
  slotDuration: {
    type: Number,
    default: 30
  }
});

export default mongoose.model("DoctorAvailability", availabilitySchema);
