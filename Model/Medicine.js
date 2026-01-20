import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  category: String,

  stock: {
    type: Number,
    default: 0
  },

  minStock: {
    type: Number,
    default: 10 // 🔴 minimum stock alert level
  },

  price: Number,

  status: {
    type: String,
    enum: ["AVAILABLE", "LOW_STOCK", "OUT_OF_STOCK"],
    default: "AVAILABLE"
  },

  batches: [
    {
      batchNumber: String,
      barcode: { type: String, unique: true },
      quantity: Number,
      expiryDate: Date,
      purchasePrice: Number,
      sellingPrice: Number
    }
  ]

}, { timestamps: true });


/* 🔁 AUTO STATUS UPDATE */
medicineSchema.pre("save", function () {
  if (this.stock <= 0) {
    this.status = "OUT_OF_STOCK";
  } else if (this.stock <= this.minStock) {
    this.status = "LOW_STOCK";
  } else {
    this.status = "AVAILABLE";
  }
});


export default mongoose.model("Medicine", medicineSchema);
