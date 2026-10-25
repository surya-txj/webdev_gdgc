const IST = 'Asia/Kolkata';

export function formatDateInIST(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

export function parseDateOnly(value) {
  const match = /^\d{4}-\d{2}-\d{2}$/.test(value || '');
  if (!match) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

export function todayIST() {
  return formatDateInIST();
}

export function addDays(dateOnly, days) {
  const date = parseDateOnly(dateOnly);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(from, to) {
  const a = parseDateOnly(from);
  const b = parseDateOnly(to);
  if (!a || !b) return null;
  return Math.round((b - a) / 86400000);
}
