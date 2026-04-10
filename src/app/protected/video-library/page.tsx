import { useCallback, useEffect, useState } from 'react';
import { VideoPreviewMedia } from '../../../components/video/VideoPreviewMedia';
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

function VideoCard({ v }: { v: VideoRecord }) {
  const title = v.title?.trim() || v.fileName;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-lavender-200 bg-white shadow-sm transition hover:border-pulse-300 hover:shadow-md">
      <div className="relative aspect-video overflow-hidden bg-black">
        {v.s3Url ? (
          <a
            href={v.s3Url}
            target="_blank"
            rel="noreferrer"
            className="block h-full w-full"
            aria-label={`Watch ${title}`}
          >
            <VideoPreviewMedia
              s3Url={v.s3Url}
              thumbnailUrl={v.thumbnailUrl}
              label={title}
            />
          </a>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">No URL</div>
        )}
        <div className="pointer-events-none absolute bottom-2 left-2 z-10 flex flex-wrap gap-1">
          <Badge tone={processingTone(v.processingStatus)}>{v.processingStatus}</Badge>
          <Badge tone={sensitivityTone(v.sensitivityStatus)}>{v.sensitivityStatus}</Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="line-clamp-2 text-base font-semibold text-pulse-900">
          {v.title?.trim() || v.fileName}
        </h2>
        <p className="line-clamp-1 text-xs text-slate-500" title={v.fileName}>
          {v.fileName}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-600">
          <span>{(v.sizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
          <span>
            {v.createdAt
              ? new Date(v.createdAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })
              : '—'}
          </span>
        </div>
        {v.s3Url ? (
          <a
            href={v.s3Url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center justify-center rounded-lg bg-pulse-700 px-3 py-2 text-sm font-semibold text-white hover:bg-pulse-800"
          >
            Open in new tab
          </a>
        ) : null}
      </div>
    </article>
  );
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
      </div>

      {error && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          {error}
        </p>
      )}

      {loading && (
        <p className="text-center text-sm text-slate-500 py-12">Loading…</p>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-12">No videos yet.</p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((v) => (
            <VideoCard key={v._id} v={v} />
          ))}
        </div>
      )}
    </div>
  );
}
