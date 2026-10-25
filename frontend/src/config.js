export const STUDIO_NAME = 'Kalanidhi';
export const STUDIO_TAGLINE = 'An Art Studio';
export const API_URL = import.meta.env.VITE_API_URL || '/api';
export const CURRENCY = 'INR';
export const formatMoney = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 }).format(Number(value || 0));
export const formatDate = (value) => value ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) : '—';
