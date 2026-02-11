import mongoose from "mongoose";

const availabilitySchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

day: {
  type: String,
},

 date: {
    type: String, // YYYY-MM-DD
  },

  startTime: String,
  endTime: String,
  slotDuration: {
    type: Number,
    default: 30
  }
},{ timestamps: true });

export default mongoose.model("DoctorAvailability", availabilitySchema);
