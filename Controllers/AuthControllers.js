import UserModel from "../Model/UserModel.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

/* ================= SIGNUP ================= */

// Helper: ensure registrationNumber index is safe
const ensureRegistrationNumberIndex = async () => {
  const db = mongoose.connection.db;
  const usersCollection = db.collection("users");

  // Drop old index if exists
  try {
    await usersCollection.dropIndex("registrationNumber_1");
    console.log("Old registrationNumber index dropped");
  } catch (err) {
    console.log("No old index found, skipping drop");
  }

  // Clean non-doctor documents
  await usersCollection.updateMany(
    { role: { $ne: "doctor" } },
    { $unset: { registrationNumber: "" } }
  );
  console.log("Non-doctor registrationNumber fields cleaned");

  // Create new sparse unique index
  await usersCollection.createIndex(
    { registrationNumber: 1 },
    { unique: true, sparse: true }
  );
  console.log("Sparse unique index ensured for registrationNumber");
};

export const Signup = async (req, res) => {
  const { name, email, password, role, phone, department, registrationNumber } = req.body;

  try {
    // 0. Ensure registrationNumber index is correct before signup
    await ensureRegistrationNumberIndex();

    // 1. Check if email already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // 2. Validate doctor-only fields
    if (role === "doctor") {
      if (!department || !registrationNumber) {
        return res.status(400).json({ message: "Department and Registration Number are required for doctors." });
      }

      // Optional: check registrationNumber uniqueness
      const regExists = await UserModel.findOne({ registrationNumber });
      if (regExists) {
        return res.status(400).json({ message: "Registration Number already exists" });
      }
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    // 4. Create user object conditionally
    const activationCode = uuidv4();
    const userData = {
      name,
      email,
      password: hashPassword,
      role,
      phone,
      activationCode,
      ...(role === "doctor" && { department, registrationNumber })
    };

    // 5. Save user
    const user = new UserModel(userData);
    await user.save();

    // 6. Send activation email
    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
    rejectUnauthorized: false, // <<< add this line
  }
    });


    const activationLink = `http://localhost:${process.env.PORT}/auth/activate/${activationCode}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Activate your account",
     html: `
        <h3>Welcome ${name}</h3>
        <p>Click the link below to activate your account:</p>
        <a href="${activationLink}">${activationLink}</a>
      `,
    };

    await transport.sendMail(mailOptions);

    // 7. Respond to client
    res.status(200).json({ message: "Signup successful. Please check your email to activate your account." });

  } catch (error) {
    console.error(error);

    // Catch duplicate key errors
    if (error.code === 11000) {
      if (error.keyPattern?.registrationNumber) {
        return res.status(400).json({ message: "Registration Number already exists" });
      }
      if (error.keyPattern?.email) {
        return res.status(400).json({ message: "Email already exists" });
      }
    }

    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

/* ================= ACTIVATE ACCOUNT ================= */
export const activate = async (req, res) => {
  try {
    const { activationCode } = req.params;

    console.log("Activation code received:", activationCode);

    const user = await UserModel.findOne({ activationCode });
    console.log("User found:", user);

    if (!user) {
      return res.status(400).json({ message: "Invalid activation code" });
    }
    

    user.isActivated = true;
    user.activationCode = undefined;
    await user.save();

    res.status(200).json({ message: "Account activated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Activation failed" });
  }
};
/* ================= SIGN IN ================= */
export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User does not exist" });
    }

    if (!user.isActivated) {
      return res.status(403).json({
        message: "Please activate your account before logging in",
      });
    }

    if (user.isBlocked) {
  return res.status(403).json({
    message: "Your account has been blocked. Contact admin.",
  });
}

    const isMatching = await bcrypt.compare(password, user.password);
    if (!isMatching) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    // ✅ ADDED: JWT TOKEN (NO LOGIC CHANGE)
 const token = jwt.sign(
  {
    userId: user._id,   // ✅ FIX
    role: user.role
  },
  process.env.JWT_SECRET,
  { expiresIn: "1d" }
);

    // ✅ ADDED: ROLE → NAVIGATION MAP
    const roleRedirectMap = {
      admin: "/admin/dashboard",
      doctor: "/doctor/dashboard",
      nurse: "/nurse/dashboard",
      user: "/user/dashboard",
    };

    res.status(200).json({
      message: "Login successful",
      token,                 // ✅ added
      redirectTo: roleRedirectMap[user.role], // ✅ added
      user                   // ❌ unchanged (you already had this)
    });

  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

// block / unblock users
export const blockUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await UserModel.findByIdAndUpdate(
      id,
      { isBlocked: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User blocked successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await UserModel.findByIdAndUpdate(
      id,
      { isBlocked: false },
      { new: true }
    );

    res.status(200).json({
      message: "User unblocked successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      req.body,                 // data to update
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.find(); // 👈 gets all users
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await UserModel.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
