import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import { ProtectedRoute } from './components/Guards';
import Landing from './pages/public/Landing';
import Gallery from './pages/public/Gallery';
import PaintingDetail from './pages/public/PaintingDetail';
import AuthPage from './pages/public/AuthPage';
import Walls from './pages/public/Walls';
import Pottery from './pages/public/Pottery';
import Dashboard from './pages/customer/Dashboard';
import BookWall from './pages/customer/BookWall';
import PotteryForm from './pages/customer/PotteryForm';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPaintings from './pages/admin/AdminPaintings';
import AdminLists from './pages/admin/AdminLists';
import { STUDIO_NAME } from './config';
import Logo from './components/Logo';

function AppShell({ children }) { return <><Navbar />{children}<footer className="footer"><Logo variant="full" className="footer-logo" /><p>© 2026 {STUDIO_NAME} · Handmade work for lived-in spaces.</p><div className="footer-links"><a href="mailto:studio@example.com">Contact</a><a href="/paintings">Gallery</a></div></footer></>; }
export default function App() { return <Routes>
  <Route path="/" element={<Landing />} /><Route path="/paintings" element={<AppShell><Gallery /></AppShell>} /><Route path="/paintings/:id" element={<AppShell><PaintingDetail /></AppShell>} /><Route path="/walls" element={<AppShell><Walls /></AppShell>} /><Route path="/pottery" element={<AppShell><Pottery /></AppShell>} /><Route path="/login" element={<AuthPage mode="login" />} /><Route path="/signup" element={<AuthPage mode="signup" />} />
  <Route path="/dashboard" element={<ProtectedRoute role="customer"><AppShell><Dashboard /></AppShell></ProtectedRoute>} /><Route path="/book-wall" element={<ProtectedRoute role="customer"><AppShell><BookWall /></AppShell></ProtectedRoute>} /><Route path="/pottery/new" element={<ProtectedRoute role="customer"><AppShell><PotteryForm /></AppShell></ProtectedRoute>} /><Route path="/pottery/:id/edit" element={<ProtectedRoute role="customer"><AppShell><PotteryForm /></AppShell></ProtectedRoute>} />
  <Route path="/admin" element={<ProtectedRoute role="admin"><AppShell><AdminDashboard /></AppShell></ProtectedRoute>} /><Route path="/admin/paintings" element={<ProtectedRoute role="admin"><AppShell><AdminPaintings /></AppShell></ProtectedRoute>} /><Route path="/admin/orders" element={<ProtectedRoute role="admin"><AppShell><AdminLists type="orders" /></AppShell></ProtectedRoute>} /><Route path="/admin/bookings" element={<ProtectedRoute role="admin"><AppShell><AdminLists type="bookings" /></AppShell></ProtectedRoute>} /><Route path="/admin/pottery" element={<ProtectedRoute role="admin"><AppShell><AdminLists type="pottery" /></AppShell></ProtectedRoute>} />
  <Route path="*" element={<AppShell><div className="container page-section"><div className="state-card card"><h3>That page wandered off</h3><a className="button dark" href="/">Back to the studio</a></div></div></AppShell>} />
</Routes>; }
