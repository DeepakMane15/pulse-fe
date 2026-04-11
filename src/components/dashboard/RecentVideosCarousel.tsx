import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { VideoPreviewMedia } from '../video/VideoPreviewMedia';
import { api } from '../../lib/api';
import { getStoredUser } from '../../lib/auth';
import { getVideoSocket } from '../../lib/socket';
import type { PaginatedResponse, VideoRecord } from '../../types/video';

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

function formatSizeMb(sizeBytes: number): string {
  return (sizeBytes / (1024 * 1024)).toFixed(2);
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RecentVideoCard({ v }: { v: VideoRecord }) {
  const title = v.title?.trim() || v.fileName;
  const durationText = formatDuration(v.durationSeconds);
  const playerHref = `/video-player?videoId=${encodeURIComponent(v._id)}&page=1&limit=10&safety=all&q=`;

  return (
    <article className="group flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-lavender-200 bg-white shadow-sm transition hover:border-pulse-300 hover:shadow-md">
      <div className="relative aspect-video overflow-hidden bg-black">
        {v.s3Url ? (
          <Link
            to={playerHref}
            className="block h-full w-full"
            aria-label={`Watch ${title}`}
          >
            <VideoPreviewMedia
              s3Url={v.s3Url}
              thumbnailUrl={v.thumbnailUrl}
              label={title}
            />
          </Link>
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
          <span>{formatSizeMb(v.sizeBytes)} MB</span>
          <span>
            {v.createdAt
              ? new Date(v.createdAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })
              : '—'}
          </span>
        </div>
        {durationText ? <p className="text-xs text-slate-500">Duration: {durationText}</p> : null}
      </div>
    </article>
  );
}

export function RecentVideosCarousel() {
  const user = getStoredUser();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { data } = await api.get<{ data: PaginatedResponse<VideoRecord> }>(
        '/videos?page=1&limit=10'
      );
      setVideos(data.data.items ?? []);
    } catch {
      setError('Could not load videos.');
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const socket = getVideoSocket();
    const onUploaded = (payload: { tenantId?: string }) => {
      if (user?.tenantId && payload.tenantId && String(payload.tenantId) !== user.tenantId) return;
      load();
    };
    socket.on('video:uploaded', onUploaded);
    return () => {
      socket.off('video:uploaded', onUploaded);
    };
  }, [load, user?.tenantId]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const w = Math.min(340, el.clientWidth * 0.85);
    el.scrollBy({ left: dir * w, behavior: 'smooth' });
  };

  return (
    <section className="rounded-2xl border border-lavender-200 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-pulse-900">Recently uploaded</h2>
          <p className="mt-0.5 text-sm text-slate-600">Latest 10 videos in your workspace.</p>
        </div>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => scrollByDir(-1)}
          className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-lavender-200 bg-white/95 text-pulse-800 shadow-md backdrop-blur-sm transition hover:bg-lavender-50"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => scrollByDir(1)}
          className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-lavender-200 bg-white/95 text-pulse-800 shadow-md backdrop-blur-sm transition hover:bg-lavender-50"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-smooth px-12 py-1 [scrollbar-width:thin]"
        >
          {loading && (
            <p className="px-2 py-8 text-sm text-slate-500">Loading…</p>
          )}
          {!loading && error && (
            <p className="px-2 py-8 text-sm text-amber-800">{error}</p>
          )}
          {!loading && !error && videos.length === 0 && (
            <p className="px-2 py-8 text-sm text-slate-500">No videos yet.</p>
          )}
          {!loading &&
            !error &&
            videos.map((v) => <RecentVideoCard key={v._id} v={v} />)}
        </div>
      </div>
    </section>
  );
}
