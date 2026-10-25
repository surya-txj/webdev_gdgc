import { createContext, useContext, useState } from 'react';

const ToastContext = createContext(null);
export function ToastProvider({ children }) { const [toasts, setToasts] = useState([]); const push = (message, type = 'info') => { const id = Date.now() + Math.random(); setToasts((items) => [...items, { id, message, type }]); setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4200); }; return <ToastContext.Provider value={{ push }}>{children}<div className="toast-stack">{toasts.map((toast) => <div key={toast.id} className={`toast toast-${toast.type}`}>{toast.message}</div>)}</div></ToastContext.Provider>; }
export const useToast = () => useContext(ToastContext);
export const Button = ({ children, variant = 'dark', className = '', ...props }) => <button className={`button ${variant} ${className}`} {...props}>{children}</button>;
export const StatusChip = ({ status }) => <span className={`status-chip status-${status}`}>{status}</span>;
export const Card = ({ children, className = '', ...props }) => <div className={`card ${className}`} {...props}>{children}</div>;
export function LoadingState({ label = 'Loading the studio…' }) { return <Card className="state-card"><div className="loader" /><p className="muted">{label}</p></Card>; }
export function EmptyState({ title = 'Nothing here yet', message, action }) { return <Card className="state-card"><h3>{title}</h3><p className="muted">{message}</p>{action}</Card>; }
export function ErrorState({ error, retry }) { return <Card className="state-card"><h3>Something went wrong</h3><p className="muted">{error?.message || 'Please try again.'}</p><Button onClick={retry}>Retry</Button></Card>; }
export function Modal({ open, title, onClose, children }) { if (!open) return null; return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal card"><div className="modal-head"><h3>{title}</h3><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>{children}</div></div>; }
export function ConfirmDialog({ open, title = 'Are you sure?', message, confirmLabel = 'Confirm', onClose, onConfirm, busy }) { return <Modal open={open} title={title} onClose={onClose}><p className="muted">{message}</p><div className="actions modal-actions"><Button variant="light" onClick={onClose}>Keep it</Button><Button onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</Button></div></Modal>; }
export function Tabs({ items, active, onChange }) { return <div className="tabs">{items.map((item) => <button className={active === item.id ? 'active' : ''} onClick={() => onChange(item.id)} key={item.id}>{item.label}</button>)}</div>; }
export function StatCard({ label, value, accent = 'mint' }) { return <Card className={`stat-card accent-${accent}`}><span className="muted">{label}</span><strong className="display">{value}</strong></Card>; }
