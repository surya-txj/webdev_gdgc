import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, LoadingState } from './Shared';

export function ProtectedRoute({ role, children }) {
  const { loading, session, profile } = useAuth(); const location = useLocation();
  if (loading) return <div className="container page-section"><LoadingState /></div>;
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (role && profile?.role !== role) return <div className="container page-section"><Card className="state-card"><h3>{role === 'admin' ? 'This area is for the studio' : 'This area is for customers'}</h3><p className="muted">Your account can still browse the public studio.</p></Card></div>;
  return children;
}
