import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getLoginErrorMessage,
  getStoredToken,
  getStoredUser,
  loginWithPassword
} from '../../../lib/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (getStoredToken() && getStoredUser()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginWithPassword(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getLoginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-lavender-200 bg-white/90 p-8 shadow-lg shadow-pulse-900/5 backdrop-blur-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-pulse-700 text-lg font-bold text-white">
            P
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-pulse-900">
            Sign in to Pulse
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Use your workspace email and password.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label
              htmlFor="login-email"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="w-full rounded-lg border border-lavender-200 bg-white px-3 py-2.5 text-slate-900 outline-none ring-pulse-500/30 transition placeholder:text-slate-400 focus:border-pulse-500 focus:ring-2"
              placeholder="you@company.com"
              disabled={submitting}
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className="w-full rounded-lg border border-lavender-200 bg-white px-3 py-2.5 text-slate-900 outline-none ring-pulse-500/30 transition placeholder:text-slate-400 focus:border-pulse-500 focus:ring-2"
              placeholder="••••••••"
              disabled={submitting}
            />
          </div>

          {error ? (
            <p
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-100"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-pulse-700 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-pulse-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulse-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}
