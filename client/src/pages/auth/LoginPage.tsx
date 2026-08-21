import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../services/apiError';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const user = await login({ email, password });
      const destination = location.state?.from || (user.role === 'seller' ? '/seller' : user.role === 'super_admin' ? '/admin' : '/customer');
      navigate(destination, { replace: true });
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Unable to log in.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-card">
      <span className="eyebrow">Welcome back</span><h1>Log in</h1><p>Session and role routing are connected to the ArtisanCart API.</p>
      <form onSubmit={handleSubmit}>
        <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Logging in...' : 'Log in'}</button>
      </form>
      <p className="auth-footer">New to ArtisanCart? <Link to="/register">Create an account</Link></p>
    </section>
  );
}
