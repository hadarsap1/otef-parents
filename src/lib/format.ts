const TZ = "Asia/Jerusalem";

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: TZ,
  });
}

function toIsraelDateStr(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: TZ }); // "YYYY-MM-DD"
}

export function formatDateRelative(iso: string) {
  const dStr = toIsraelDateStr(new Date(iso));
  const todayStr = toIsraelDateStr(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = toIsraelDateStr(tomorrow);

  if (dStr === todayStr) return "היום";
  if (dStr === tomorrowStr) return "מחר";

  return formatDate(iso);
}
