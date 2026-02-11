const to12Hour = (time24) => {
  const [hour, minute] = time24.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
};

export const generateSlots = (start, end, duration) => {
  const slots = [];

  let [sh, sm] = start.split(":").map(Number);
  let [eh, em] = end.split(":").map(Number);

  let current = sh * 60 + sm;
  const endTime = eh * 60 + em;

  while (current + duration <= endTime) {
    const sH = String(Math.floor(current / 60)).padStart(2, "0");
    const sM = String(current % 60).padStart(2, "0");

    const e = current + duration;
    const eH = String(Math.floor(e / 60)).padStart(2, "0");
    const eM = String(e % 60).padStart(2, "0");

    const start24 = `${sH}:${sM}`;
    const end24 = `${eH}:${eM}`;

    slots.push(
      `${to12Hour(start24)} - ${to12Hour(end24)}`
    );

    current += duration;
  }

  return slots;
};
