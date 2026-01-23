import UserModel from "../Model/UserModel.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";

/* ================= SIGNUP ================= */
export const Signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const activationCode = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new UserModel({
      name,
      email,
      password: hashedPassword,
      activationCode,
      isActivated: false,
    });

    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail", // recommended
       tls: {
    rejectUnauthorized: false
  },
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const activationLink = `http://localhost:8001/auth/activate/${activationCode}`;

   


    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Account Activation",
      html: `
        <h3>Welcome ${name}</h3>
        <p>Click the link below to activate your account:</p>
        <a href="${activationLink}">${activationLink}</a>
      `,
    });

  

    res.status(201).json({
      message: "Signup successful! Please check your email to activate your account.",
    });
  } catch (error) {
    res.status(500).json({ message: "Signup failed", error: error.message });
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
