import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { STUDIO_NAME } from '../config';
import { Button } from './Shared';
import Logo from './Logo';

const links = [
  { to: '/paintings', label: 'Paintings' },
  { to: '/walls', label: 'Walls' },
  { to: '/pottery', label: 'Pottery' },
];

export default function Navbar({ landing = false }) {
  const { profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin';

  return (
    <nav className={`navbar ${landing ? 'navbar-landing' : ''}`}>
      <Link className="brand" to="/" aria-label={`${STUDIO_NAME} home`}>
        <Logo variant="compact" />
      </Link>

      <div className="nav-links">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to}>{link.label}</NavLink>
        ))}
      </div>

      <div className="nav-actions">
        {!loading && profile ? (
          <>
            <Button variant="dark" className="small" onClick={() => navigate(isAdmin ? '/admin' : '/dashboard')}>
              {isAdmin ? 'Studio' : 'Dashboard'}
            </Button>
            <button className="avatar" title="Log out" onClick={() => signOut()}>
              {profile.full_name?.[0]?.toUpperCase() || 'A'}
            </button>
          </>
        ) : (
          <>
            <Link className="nav-login" to="/login">Log in</Link>
            <Link className="button dark small" to="/signup">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
