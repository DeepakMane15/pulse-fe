import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { getVideoSocket } from '../../../lib/socket';
import type { VideoRecord } from '../../../types/video';

function Badge({
  children,
  tone
}: {
  children: React.ReactNode;
  tone: 'neutral' | 'ok' | 'warn' | 'bad';
}) {
  const styles = {
    neutral: 'bg-slate-100 text-slate-800 ring-slate-200',
    ok: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    warn: 'bg-amber-50 text-amber-900 ring-amber-200',
    bad: 'bg-red-50 text-red-800 ring-red-200'
  } as const;
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

function processingTone(s: string): 'neutral' | 'ok' | 'warn' | 'bad' {
  if (s === 'completed') return 'ok';
  if (s === 'failed') return 'bad';
  if (s === 'processing') return 'warn';
  return 'neutral';
}

function sensitivityTone(s: string): 'neutral' | 'ok' | 'warn' | 'bad' {
  if (s === 'safe') return 'ok';
  if (s === 'flagged') return 'bad';
  return 'neutral';
}

export default function VideoLibraryPage() {
  const [rows, setRows] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { data } = await api.get<{ data: VideoRecord[] }>('/videos?limit=200');
      setRows(data.data ?? []);
    } catch {
      setError('Could not load videos.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const socket = getVideoSocket();
    const onUploaded = () => load();
    socket.on('video:uploaded', onUploaded);
    return () => {
      socket.off('video:uploaded', onUploaded);
    };
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-pulse-900">Video Library</h1>
        <p className="mt-1 text-slate-600">
          All videos in your workspace, with processing and moderation status.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-lavender-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-lavender-200 bg-lavender-50/80 text-xs font-semibold uppercase tracking-wide text-pulse-800">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Processing</th>
                <th className="px-4 py-3">Sensitivity</th>
                <th className="px-4 py-3">Uploaded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lavender-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-amber-800">
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No videos yet.
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                rows.map((v) => (
                  <tr key={v._id} className="hover:bg-lavender-50/50">
                    <td className="px-4 py-3 font-medium text-pulse-900">
                      {v.title?.trim() || '—'}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-slate-600" title={v.fileName}>
                      {v.fileName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {(v.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={processingTone(v.processingStatus)}>{v.processingStatus}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={sensitivityTone(v.sensitivityStatus)}>{v.sensitivityStatus}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {v.createdAt
                        ? new Date(v.createdAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
