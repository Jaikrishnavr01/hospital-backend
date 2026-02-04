import mongoose from "mongoose";

const hospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  address: {
      line1: String,
      city: String,
      state: String,
      pincode: String
    },
    phone: String,
    email: String,
    website: String,
    logo: String,       
    registrationNo: String
  },
  { timestamps: true }
);

export default mongoose.model("Hospital", hospitalSchema);