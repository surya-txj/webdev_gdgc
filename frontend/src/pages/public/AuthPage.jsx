import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, useToast } from '../../components/Shared';
import { STUDIO_NAME } from '../../config';
import Logo from '../../components/Logo';

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const { supabase, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const next = new URLSearchParams(location.search).get('next') || (isSignup ? '/dashboard' : '/');
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) navigate(next, { replace: true });
  }, [session, next, navigate]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.fullName } } });
        if (signUpError) throw signUpError;
        if (!data.session) {
          toast.push('Check your email to confirm your account, then log in.');
          navigate('/login', { replace: true });
          return;
        }
        toast.push('Your studio account is ready.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return <main className="auth-page"><Card className="auth-card"><Link className="auth-brand" to="/" aria-label={`${STUDIO_NAME} home`}><Logo variant="full" /></Link><h1>{isSignup ? 'Make a little room.' : 'Come on in.'}</h1><p className="muted">{isSignup ? 'Create your customer account to collect work, book walls, and request pottery.' : 'Log in to keep exploring the studio.'}</p><form onSubmit={submit} className="grid">{isSignup && <div className="field"><label htmlFor="fullName">Full name</label><input id="fullName" required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></div>}<div className="field"><label htmlFor="email">Email</label><input id="email" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div><div className="field"><label htmlFor="password">Password</label><input id="password" type="password" minLength="6" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></div>{error && <div className="field-error">{error}</div>}<Button type="submit" disabled={busy}>{busy ? 'Opening…' : isSignup ? 'Create account' : 'Log in'}</Button></form><p className="auth-link">{isSignup ? 'Already have an account?' : 'New to the studio?'} <Link to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Log in' : 'Sign up'}</Link></p></Card></main>;
}
