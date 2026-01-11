import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "doctor", "nurse", "user"], default: "user" },
  activationCode: { type: String },
  isActivated: { type: Boolean, default: false }
});

const UserModel = mongoose.model("User", userSchema);

export default UserModel;
