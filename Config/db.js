import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);

    mongoose.connection.on('connected', () => {
          console.log('mongoose connected');
      })

    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error.message);
    process.exit(1); 
  }
};

export default connectDB;
