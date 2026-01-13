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
    slots.push(`${sH}:${sM}-${eH}:${eM}`);
    current += duration;
  }

  return slots;
};
