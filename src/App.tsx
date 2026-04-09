import { useEffect, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { api } from './lib/api';

type HealthState =
  | { status: 'idle' }
  | { status: 'ok'; message: string }
  | { status: 'error'; message: string };

function App() {
  const [health, setHealth] = useState<HealthState>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ message?: string; service?: string }>('/health')
      .then((res) => {
        if (!cancelled) {
          setHealth({
            status: 'ok',
            message: res.data?.message ?? res.data?.service ?? 'API reachable'
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHealth({
            status: 'error',
            message: 'API not reachable (start backend on :4000 or check proxy)'
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-pulse-900">
            Welcome to Pulse
          </h1>
          <p className="mt-2 max-w-xl text-slate-600">
            Vite + React + Tailwind skeleton. Axios is configured in{' '}
            <code className="rounded bg-lavender-100 px-1.5 py-0.5 text-sm text-pulse-800">
              src/lib/api.ts
            </code>
            .
          </p>
        </div>

        <div className="rounded-2xl border border-lavender-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-pulse-700">
            API status
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            {health.status === 'idle' && 'Checking /api/health…'}
            {health.status === 'ok' && (
              <span className="text-emerald-700">{health.message}</span>
            )}
            {health.status === 'error' && (
              <span className="text-amber-800">{health.message}</span>
            )}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-dashed border-lavender-300 bg-lavender-50/50 p-5">
            <h3 className="font-medium text-pulse-800">Next</h3>
            <p className="mt-1 text-sm text-slate-600">
              Add routes, auth screens, and video upload UI here.
            </p>
          </div>
          <div className="rounded-xl border border-dashed border-lavender-300 bg-lavender-50/50 p-5">
            <h3 className="font-medium text-pulse-800">Env</h3>
            <p className="mt-1 text-sm text-slate-600">
              Optional{' '}
              <code className="text-xs text-pulse-700">VITE_API_BASE_URL</code>{' '}
              for a full API URL; otherwise the dev server proxies{' '}
              <code className="text-xs text-pulse-700">/api</code>.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default App;
