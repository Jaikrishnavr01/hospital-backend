
import Hospital from "../Model/Hospital.js";

/**
 * GET hospital info
 */
export const getHospitalInfo = async (req, res) => {
  try {
    let hospital = await Hospital.findOne();

    // If not exists, create default record
    if (!hospital) {
      hospital = await Hospital.create({});
    }

    res.status(200).json({
      success: true,
      message: "Hospital info fetched successfully",
      hospital
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * UPDATE hospital info (Admin only)
 */
export const updateHospitalInfo = async (req, res) => {
  try {
    let hospital = await Hospital.findOne();

    if (!hospital) {
      hospital = await Hospital.create(req.body);
    } else {
      Object.assign(hospital, req.body);
      await hospital.save();
    }

    res.status(200).json({
      success: true,
      message: "Hospital info updated successfully",
      hospital
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
