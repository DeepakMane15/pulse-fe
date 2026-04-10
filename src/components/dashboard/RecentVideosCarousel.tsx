import { useCallback, useEffect, useRef, useState } from 'react';
import { VideoPreviewMedia } from '../video/VideoPreviewMedia';
import { api } from '../../lib/api';
import { getStoredUser } from '../../lib/auth';
import { getVideoSocket } from '../../lib/socket';
import type { VideoRecord } from '../../types/video';

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

export function RecentVideosCarousel() {
  const user = getStoredUser();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { data } = await api.get<{ data: VideoRecord[] }>('/videos?limit=10');
      setVideos(data.data ?? []);
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
    const w = Math.min(320, el.clientWidth * 0.85);
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
            videos.map((v) => {
              const title = v.title?.trim() || v.fileName;
              return (
              <article
                key={v._id}
                className="w-56 shrink-0 rounded-xl border border-lavender-200 bg-gradient-to-b from-lavender-50/80 to-white p-4 shadow-sm"
              >
                <div className="mb-3 overflow-hidden rounded-lg bg-black">
                  {v.s3Url ? (
                    <a
                      href={v.s3Url}
                      target="_blank"
                      rel="noreferrer"
                      className="relative block aspect-video"
                      aria-label={`Watch ${title}`}
                    >
                      <VideoPreviewMedia
                        s3Url={v.s3Url}
                        thumbnailUrl={v.thumbnailUrl}
                        label={title}
                      />
                    </a>
                  ) : (
                    <div className="flex aspect-video items-center justify-center text-xs text-slate-500">
                      No URL
                    </div>
                  )}
                </div>
                <h3 className="line-clamp-2 text-sm font-semibold text-pulse-900">
                  {title}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {v.createdAt
                    ? new Date(v.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })
                    : '—'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {(v.sizeBytes / (1024 * 1024)).toFixed(2)} MB · {v.processingStatus}
                </p>
                {v.s3Url ? (
                  <a
                    href={v.s3Url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-xs font-medium text-pulse-700 underline-offset-2 hover:underline"
                  >
                    Open in new tab
                  </a>
                ) : null}
              </article>
              );
            })}
        </div>
      </div>
    </section>
  );
}
