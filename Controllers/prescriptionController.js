import Medicine from "../Model/Medicine.js";
import PharmacyBill from "../Model/PharmacyBill.js";
import { v4 as uuidv4 } from "uuid"
import Prescription from "../Model/Prescription.js";
import mongoose from "mongoose";

export const getEPrescriptionByVisit = async (req, res) => {
  try {
    const { visitId } = req.params;

    const prescription = await Prescription.findOne({ visit: visitId  })
      .populate({
        path: "doctor",
        select: "name email"
      })
      .populate({
        path: "patient",
        select: "name age gender phone"
      })
      .populate({
        path: "visit",
        select: "status createdAt"
      });

    if (!prescription) {
      return res.status(404).json({
        message: "E-Prescription not found"
      });
    }

     res.json({
      visit: prescription.visit,
      patient: prescription.visit.patient,
      doctor: prescription.visit.doctor,
      prescription
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const getAllPharmacyPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({
      sendToPharmacy: true
    })
      .populate({
        path: "patient",
        select: "name age gender phone"
      })
      .populate({
        path: "doctor",
        select: "name email"
      })
      .populate({
        path: "visit",
        select: "status createdAt"
      })
      .sort({
        priority: -1,       // HIGH → NORMAL → LOW
        createdAt: 1        // Oldest first
      });

    res.status(200).json({
      message: "Pharmacy prescriptions fetched successfully",
      count: prescriptions.length,
     prescriptions
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// POST /api/pharmacy/dispense/:prescriptionId
// export const dispenseAndBill = async (req, res) => {
//   try {
//     const { prescriptionId } = req.params;
//     const { items } = req.body; // price info from pharmacy

//     const prescription = await Prescription.findById(prescriptionId);

//     if (!prescription || !prescription.sendToPharmacy) {
//       return res.status(403).json({
//         message: "Prescription not allowed for pharmacy"
//       });
//     }

//     if (prescription.dispensed) {
//       return res.status(400).json({ message: "Already dispensed" });
//     }

//     if (!items || !Array.isArray(items) || items.length === 0) {
//       return res.status(400).json({
//         message: "Items are required to generate bill"
//       });
//     }

//     let totalAmount = 0;

//     const billItems = items.map(item => {
//       const qty = Number(item.qty);
//       const price = Number(item.price);

//       // validation
//       if (!item.medicine || item.medicine === "") {
//         throw new Error("Medicine name is required");
//       }

//       if (isNaN(qty) || isNaN(price)) {
//         throw new Error(`Invalid quantity or price for medicine: ${item.medicine}`);
//       }

//       if (qty <= 0 || price <= 0) {
//         throw new Error(`Quantity and price must be greater than 0 for medicine: ${item.medicine}`);
//       }

//       const total = qty * price;
//       totalAmount += total;

//       return {
//         medicine: item.medicine,
//         qty,
//         price,
//         total
//       };
//     });

//     if (totalAmount <= 0) {
//       return res.status(400).json({
//         message: "Total amount cannot be zero"
//       });
//     }

//     const bill = await PharmacyBill.create({
//       prescription: prescription._id,
//       patient: prescription.patient,
//       items: billItems,
//       totalAmount
//     });

//     prescription.dispensed = true;
//     await prescription.save();

//     res.json({
//       message: "Medicines dispensed & bill generated",
//       bill
//     });

//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

export const dispenseAndBill = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Items are required" });
    }

    let totalAmount = 0;
    const billItems = [];

    for (const item of items) {
      const qty = Number(item.qty);
      const price = Number(item.price);

      if (!item.medicine || isNaN(qty) || isNaN(price)) {
        return res.status(400).json({
          message: "medicine, qty and price are required"
        });
      }

      const total = qty * price;
      totalAmount += total;

      billItems.push({
        medicine: item.medicine, // ✅ STRING
        qty,
        price,
        total
      });
    }

    if (totalAmount <= 0) {
      return res.status(400).json({
        message: "Total amount must be greater than zero"
      });
    }

    const bill = await PharmacyBill.create({
      prescription: prescriptionId,
      items: billItems,
      totalAmount
    });

    res.status(201).json({
      message: "Medicines dispensed & bill generated",
      bill
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};





// POST /api/pharmacy/pay
// export const payPharmacyBill = async (req, res) => {
//   try {
//     const { billId, paymentMode } = req.body;

//     // validate payment mode
//     if (!["cash", "card", "upi"].includes(paymentMode)) {
//       return res.status(400).json({
//         message: "Invalid payment mode"
//       });
//     }

//     const bill = await PharmacyBill.findById(billId);

//     if (!bill) {
//       return res.status(404).json({
//         message: "Bill not found"
//       });
//     }

//     if (bill.status === "PAID") {
//       return res.status(400).json({
//         message: "Bill already paid"
//       });
//     }

//     bill.status = "PAID";
//     bill.paymentMode = paymentMode;

//     await bill.save();

//     res.json({
//       message: "Payment successful",
//       bill
//     });

//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

export const payPharmacyBill = async (req, res) => {
  try {
    const { billId } = req.params;
    const { paymentMode } = req.body;

    if (!["cash", "card", "upi"].includes(paymentMode)) {
      return res.status(400).json({ message: "Invalid payment mode" });
    }

    const bill = await PharmacyBill.findById(billId);
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (bill.status === "PAID") {
      return res.status(400).json({ message: "Bill already paid" });
    }

    // 🔥 UPDATE STOCK
    for (const item of bill.items) {
      const medicine = await Medicine.findOne({ name: item.medicine });

      if (!medicine) {
        return res.status(404).json({
          message: `Medicine ${item.medicine} not found`
        });
      }

      if (medicine.stock < item.qty) {
        return res.status(400).json({
          message: `Insufficient stock for ${item.medicine}`
        });
      }

      // 🔻 Reduce stock
      medicine.stock -= item.qty;

      // 🔔 LOW STOCK WARNING
      if (medicine.stock <= medicine.minimumStock) {
        medicine.status = "LOW_STOCK";
      } else {
        medicine.status = "AVAILABLE";
      }

      await medicine.save();
    }

    // ✅ Mark bill as PAID
    bill.status = "PAID";
    bill.paymentMode = paymentMode;
    await bill.save();

    res.json({
      message: "Payment successful & stock updated",
      bill
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};




// POST /api/pharmacy/scan/:barcode
export const scanMedicineByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;

    if (!barcode) {
      return res.status(400).json({
        message: "Barcode is required"
      });
    }

    // 🔍 Find medicine having this batch barcode
    const medicine = await Medicine.findOne({
      "batches.barcode": barcode
    });

    if (!medicine) {
      return res.status(404).json({
        message: "Medicine not found for this barcode"
      });
    }

    // 🎯 Find exact batch
    const batch = medicine.batches.find(
      b => b.barcode === barcode
    );

    if (!batch) {
      return res.status(404).json({
        message: "Batch not found"
      });
    }

    // ⛔ Out of stock
    if (batch.quantity <= 0) {
      return res.status(400).json({
        message: "Medicine out of stock"
      });
    }

    // ⏰ Expiry check
    if (batch.expiryDate && new Date(batch.expiryDate) < new Date()) {
      return res.status(400).json({
        message: "Medicine batch expired"
      });
    }

    res.json({
      medicineId: medicine._id,
      medicineName: medicine.name,
      batchNumber: batch.batchNumber,
      barcode: batch.barcode,
      availableQty: batch.quantity,
      price: batch.sellingPrice,
      expiryDate: batch.expiryDate,
      status: medicine.status
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// POST /api/pharmacy/dispense-partial/:prescriptionId
export const dispensePartial = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { barcode, dispenseQty } = req.body;

    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    const medicine = await Medicine.findOne({
      "batches.barcode": barcode
    });

    if (!medicine) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    const batch = medicine.batches.find(b => b.barcode === barcode);

    if (batch.quantity < dispenseQty) {
      return res.status(400).json({
        message: "Insufficient stock"
      });
    }

    // Reduce stock
    batch.quantity -= dispenseQty;
    await medicine.save();

    // Update prescription dispense qty
    const presMed = prescription.medicines.find(
      m => m.medicineName === medicine.name
    );

    presMed.dispensedQty += dispenseQty;

    // Check fully dispensed
    const allDone = prescription.medicines.every(
      m => m.dispensedQty >= m.prescribedQty
    );

    if (allDone) prescription.dispensed = true;

    await prescription.save();

    res.json({
      message: "Medicine dispensed partially",
      remaining:
        presMed.prescribedQty - presMed.dispensedQty
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// GET /api/pharmacy/stock-alerts
export const stockAlerts = async (req, res) => {
  try {
    const medicines = await Medicine.find();

    const alerts = medicines.filter(med => {
      const totalQty = med.batches.reduce(
        (sum, b) => sum + b.quantity, 0
      );
      return totalQty <= med.minStock;
    });

    res.json({
      lowStock: alerts.map(m => ({
        medicine: m.name,
        remaining:
          m.batches.reduce((s, b) => s + b.quantity, 0),
        minRequired: m.minStock
      }))
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// GET /api/pharmacy/expiry-alerts
export const expiryAlerts = async (req, res) => {
  try {
    const today = new Date();
    const next30Days = new Date();
    next30Days.setDate(today.getDate() + 30);

    const medicines = await Medicine.find({
      "batches.expiryDate": { $lte: next30Days }
    });

    const alerts = [];

    medicines.forEach(medicine => {
      medicine.batches.forEach(batch => {
        if (batch.expiryDate && batch.expiryDate <= next30Days) {
          const daysLeft = Math.ceil(
            (new Date(batch.expiryDate) - today) / (1000 * 60 * 60 * 24)
          );

          alerts.push({
            medicineName: medicine.name,
            batchNumber: batch.batchNumber,
            expiryDate: batch.expiryDate,
            daysLeft
          });
        }
      });
    });

    res.json({
      count: alerts.length,
      alerts
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const addMedicine = async (req, res) => {
  try {
    const { name, category, batches, minStock } = req.body;

    if (!name || !Array.isArray(batches) || batches.length === 0) {
      return res.status(400).json({
        message: "Medicine name and batches are required"
      });
    }

    let medicine = await Medicine.findOne({ name });

    if (!medicine) {
      medicine = new Medicine({
        name,
        category,
        minStock: minStock || 10,
        stock: 0,
        batches: []
      });
    }

    let addedStock = 0;

    for (const batch of batches) {
      if (
        batch.quantity === undefined ||
        batch.sellingPrice === undefined
      ) {
        throw new Error("Batch quantity and selling price are required");
      }

      const qty = Number(batch.quantity);
      addedStock += qty;

      const existingBatch = medicine.batches.find(
        b => b.batchNumber === batch.batchNumber
      );

      if (existingBatch) {
        // ➕ ADD QUANTITY
        existingBatch.quantity += qty;

        // 🔁 UPDATE DETAILS IF PROVIDED
        if (batch.expiryDate) {
          existingBatch.expiryDate = batch.expiryDate;
        }

        if (batch.purchasePrice !== undefined) {
          existingBatch.purchasePrice = batch.purchasePrice;
        }

        if (batch.sellingPrice !== undefined) {
          existingBatch.sellingPrice = batch.sellingPrice;
        }

      } else {
        // 🆕 NEW BATCH
        medicine.batches.push({
          batchNumber: batch.batchNumber || `BATCH-${Date.now()}`,
          barcode: batch.barcode || uuidv4(),
          quantity: qty,
          expiryDate: batch.expiryDate,
          purchasePrice: batch.purchasePrice,
          sellingPrice: batch.sellingPrice
        });
      }
    }

    // 🔁 UPDATE TOTAL STOCK
    medicine.stock += addedStock;

    if (minStock !== undefined) {
      medicine.minStock = minStock;
    }

    // Latest selling price
    medicine.price =
      medicine.batches[medicine.batches.length - 1]?.sellingPrice;

    await medicine.save();

    res.status(201).json({
      message: "Medicine stock updated successfully",
      medicine
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
