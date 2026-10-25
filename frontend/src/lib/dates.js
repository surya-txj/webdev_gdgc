const IST = 'Asia/Kolkata';
export function todayIST() { return new Intl.DateTimeFormat('en-CA', { timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
export function addDays(dateOnly, amount) { const date = new Date(`${dateOnly}T00:00:00`); date.setDate(date.getDate() + amount); return date.toISOString().slice(0, 10); }
