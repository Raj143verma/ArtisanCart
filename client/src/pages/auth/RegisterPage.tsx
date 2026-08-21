import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../services/apiError';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage(''); setIsSubmitting(true);
    try { await register(form); setMessage('Registration successful. Verify your email before logging in.'); setTimeout(() => navigate('/login'), 1000); }
    catch (requestError: unknown) { setError(getApiErrorMessage(requestError, 'Unable to register.')); }
    finally { setIsSubmitting(false); }
  }

  return (
    <section className="auth-card">
      <span className="eyebrow">Join the marketplace</span><h1>Create account</h1><p>Registration uses the backend authentication contract.</p>
      <form onSubmit={handleSubmit}>
        <div className="form-grid"><label>First name<input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></label><label>Last name<input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></label></div>
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" /></label>
        <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} autoComplete="new-password" /></label>
        {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}
        <button className="button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Create account'}</button>
      </form>
      <p className="auth-footer">Already registered? <Link to="/login">Log in</Link></p>
    </section>
  );
}
