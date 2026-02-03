import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "doctor", "nurse", "user", "pharmacist"], default: "user" },
  phone: { type: String},
  department: { type: String, required: function() { return this.role === "doctor"; } },
  registrationNumber: { type: String, required: function() { return this.role === "doctor"; }, unique: true },
  signature: { type: String, required: function() { return this.role === "doctor"; } },
  activationCode: { type: String },
  isActivated: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
});

const UserModel = mongoose.model("User", userSchema);

export default UserModel;
