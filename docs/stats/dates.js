export function toLocalDate(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalDate(d.getTime());
}
export function dateRange(endDate, count) {
  const dates = [];
  for (let i = count - 1; i >= 0; i--) {
    dates.push(addDays(endDate, -i));
  }
  return dates;
}
