import cron from "node-cron";
import Appointment from "../Model/Appointment.js";

cron.schedule("*/1 * * * *", async () => {
  await Appointment.updateMany(
    { status: "pending", expiresAt: { $lt: new Date() } },
    { status: "cancelled" }
  );
});
