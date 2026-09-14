import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../auth';
import { useLearning } from '../store';

type Mode = 'sign-in' | 'register' | 'forgot';

export function AccountPage() {
  const auth = useAuth();
  const { syncStatus } = useLearning();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'sign-in') { await auth.signIn(email, password); setMessage('Signed in.'); }
      else if (mode === 'register') setMessage(await auth.signUp(email, password, nickname));
      else { await auth.sendPasswordReset(email); setMessage('If that account exists, a password-reset email is on its way.'); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The account request failed. Try again.'); }
    finally { setBusy(false); setPassword(''); }
  }
  async function saveNickname(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { await auth.updateNickname(nickname); setMessage('Profile updated.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The profile could not be updated.'); }
    finally { setBusy(false); }
  }
  async function savePassword(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { await auth.updatePassword(newPassword); setNewPassword(''); setMessage('Password updated.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The password could not be updated.'); }
    finally { setBusy(false); }
  }
  async function leave() {
    setBusy(true); setError('');
    try { await auth.signOut(); setMessage('Signed out. This device has returned to its guest progress.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Sign out failed.'); }
    finally { setBusy(false); }
  }

  if (auth.status === 'loading') return <Layout><section className="account-page"><p role="status">Restoring your account…</p></section></Layout>;
  if (auth.status === 'unconfigured') return <Layout><section className="account-page empty-state"><p className="eyebrow">Accounts · Setup required</p>
    <h1>Account service is not connected yet.</h1><p>Guest learning remains available. Registration, sign-in and cloud progress will become active after the public Supabase configuration and database migration are deployed.</p>
    <p className="inline-notice">No placeholder users or localStorage login is being used.</p><Link className="button primary" to="/">Continue as guest</Link>
  </section></Layout>;

  if (auth.user) return <Layout><section className="account-page"><p className="eyebrow">Your account</p><h1>Profile</h1>
    <dl className="profile-details"><div><dt>User ID</dt><dd>{auth.user.id}</dd></div><div><dt>Email</dt><dd>{auth.user.email}</dd></div>
      <div><dt>Registered</dt><dd>{new Date(auth.user.created_at).toLocaleString()}</dd></div><div><dt>Last sign-in</dt><dd>{auth.user.last_sign_in_at ? new Date(auth.user.last_sign_in_at).toLocaleString() : 'Not available'}</dd></div>
      <div><dt>Progress storage</dt><dd>{syncStatus === 'saving' ? 'Saving…' : syncStatus === 'synced' ? 'Synced to account' : syncStatus === 'error' ? 'Needs connection' : 'Loading…'}</dd></div></dl>
    {message && <p className="form-success" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}
    <div className="account-forms"><form className="account-form" onSubmit={saveNickname}><h2>Basic profile</h2><label>Nickname (optional)<input value={nickname} placeholder={auth.profile?.nickname ?? ''} maxLength={60} onChange={event => setNickname(event.target.value)} /></label>
      <button className="button primary" disabled={busy}>Save nickname</button></form>
      <form className="account-form" onSubmit={savePassword}><h2>Change password</h2><label>New password<input type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={event => setNewPassword(event.target.value)} /></label>
        <button className="button secondary" disabled={busy}>Update password</button></form></div>
    <div className="button-row account-actions">{auth.isAdmin && <Link className="button secondary" to="/admin">Administrator dashboard</Link>}
      <button className="text-button" disabled={busy} onClick={() => void leave()}>Sign out</button></div>
  </section></Layout>;

  return <Layout><section className="account-page"><p className="eyebrow">Account</p><h1>{mode === 'register' ? 'Create your account.' : mode === 'forgot' ? 'Reset your password.' : 'Welcome back.'}</h1>
    <p>Your password is handled by Supabase Auth and is never stored in this website's code or learning database.</p>
    <div className="auth-tabs"><button className={mode === 'sign-in' ? 'is-active' : ''} onClick={() => setMode('sign-in')}>Sign in</button><button className={mode === 'register' ? 'is-active' : ''} onClick={() => setMode('register')}>Register</button></div>
    <form className="account-form" onSubmit={submit}>{mode === 'register' && <label>Nickname (optional)<input maxLength={60} autoComplete="nickname" value={nickname} onChange={event => setNickname(event.target.value)} /></label>}
      <label>Email<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>
      {mode !== 'forgot' && <label>Password<input type="password" minLength={8} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required value={password} onChange={event => setPassword(event.target.value)} /></label>}
      {message && <p className="form-success" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset email' : 'Sign in'}</button>
      {mode !== 'forgot' && <button type="button" className="text-button" onClick={() => setMode('forgot')}>Forgot password?</button>}
      {mode === 'forgot' && <button type="button" className="text-button" onClick={() => setMode('sign-in')}>Back to sign in</button>}
    </form>
  </section></Layout>;
}
