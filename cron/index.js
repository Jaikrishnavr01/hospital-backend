import cron from "node-cron";
import Appointment from "../Model/Appointment.js";
import User from "../Model/UserModel.js";

// 🔓 unlock expired slots
cron.schedule("* * * * *", async () => {
  await Appointment.updateMany(
    {
      isLocked: true,
      lockExpiresAt: { $lt: new Date() }
    },
    {
      isLocked: false,
      status: "cancelled"
    }
  );
});

// 🔔 reminders
cron.schedule("*/10 * * * *", async () => {
  const now = new Date();

  const appointments = await Appointment.find({
    status: "confirmed"
  });

  for (const appt of appointments) {
    const apptTime = new Date(`${appt.date}T${appt.timeSlot}`);
    const diff = (apptTime - now) / (1000 * 60 * 60);

    const user = await User.findById(appt.userId);

    if (diff <= 24 && diff > 23 && !appt.reminder24hSent) {
      console.log(`🔔 24h reminder → ${user.email}`);
      appt.reminder24hSent = true;
    }

    if (diff <= 2 && diff > 1 && !appt.reminder2hSent) {
      console.log(`🔔 2h reminder → ${user.email}`);
      appt.reminder2hSent = true;
    }

    await appt.save();
  }
});
