import express from "express";
import dotenv from "dotenv";

import connectDB from './Config/db.js'
import userRoutes from "./Router/User.js";

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

app.use("/auth", userRoutes);

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
