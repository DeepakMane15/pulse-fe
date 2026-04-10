import { useEffect, useState } from 'react';
import { RecentVideosCarousel } from '../../components/dashboard/RecentVideosCarousel';
import { VideoUploadSection } from '../../components/dashboard/VideoUploadSection';
import { api } from '../../lib/api';

type HealthState =
  | { status: 'idle' }
  | { status: 'ok'; message: string }
  | { status: 'error'; message: string };

export default function HomePage() {
  const [health, setHealth] = useState<HealthState>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ status?: string; service?: string }>('/health')
      .then((res) => {
        if (!cancelled) {
          setHealth({
            status: 'ok',
            message: res.data?.service ?? res.data?.status ?? 'API reachable'
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
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-pulse-900">Dashboard</h1>
          <p
            className={`mt-1 text-sm ${
              health.status === 'ok'
                ? 'text-emerald-700'
                : health.status === 'error'
                  ? 'text-amber-800'
                  : 'text-slate-500'
            }`}
          >
            {health.status === 'idle' ? 'Checking API…' : health.message}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <VideoUploadSection />
        <RecentVideosCarousel />
      </div>
    </div>
  );
}
