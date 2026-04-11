import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../../lib/api';
import type { PaginatedResponse, VideoRecord } from '../../../types/video';

function parseSafety(value: string | null): 'all' | 'safe' | 'flagged' {
  if (value === 'safe' || value === 'flagged') return value;
  return 'all';
}

function IconPrevTrack() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M8 6h2v12H8zM12 12l8-6v12z" />
    </svg>
  );
}

function IconNextTrack() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M14 6h2v12h-2zM4 18V6l8 6z" />
    </svg>
  );
}

function IconReplay10() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" aria-hidden>
      <path d="M12 5a7 7 0 1 1-6.3 9.8" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 4v5h5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="12" y="16" textAnchor="middle" fontSize="7" fill="currentColor">
        10
      </text>
    </svg>
  );
}

function IconForward10() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" aria-hidden>
      <path d="M12 5a7 7 0 1 0 6.3 9.8" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 4v5h-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="12" y="16" textAnchor="middle" fontSize="7" fill="currentColor">
        10
      </text>
    </svg>
  );
}

export default function VideoPlayerPage() {
  const [searchParams] = useSearchParams();
  const playerRef = useRef<HTMLVideoElement>(null);
  const initialSelectionDoneRef = useRef(false);
  const [rows, setRows] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? '9') || 9));
  const safety = parseSafety(searchParams.get('safety'));
  const q = searchParams.get('q')?.trim() ?? '';
  const videoIdFromQuery = searchParams.get('videoId');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        safety,
        q
      });
      const { data } = await api.get<{ data: PaginatedResponse<VideoRecord> }>(`/videos?${params}`);
      setRows(data.data.items ?? []);
    } catch {
      setError('Could not load videos.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [limit, page, q, safety]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedVideoId(null);
      initialSelectionDoneRef.current = false;
      return;
    }
    if (
      !initialSelectionDoneRef.current &&
      videoIdFromQuery &&
      rows.some((v) => v._id === videoIdFromQuery)
    ) {
      setSelectedVideoId(videoIdFromQuery);
      initialSelectionDoneRef.current = true;
      return;
    }
    if (!selectedVideoId || !rows.some((v) => v._id === selectedVideoId)) {
      setSelectedVideoId(rows[0]._id);
    }
    initialSelectionDoneRef.current = true;
  }, [rows, selectedVideoId, videoIdFromQuery]);

  const selectedIndex = useMemo(
    () => rows.findIndex((v) => v._id === selectedVideoId),
    [rows, selectedVideoId]
  );
  const selectedVideo = selectedIndex >= 0 ? rows[selectedIndex] : null;

  const playVideoAt = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= rows.length) return;
    setSelectedVideoId(rows[nextIndex]._id);
  };

  const skipBy = (seconds: number) => {
    const player = playerRef.current;
    if (!player) return;
    const duration = Number.isFinite(player.duration) ? player.duration : 0;
    const nextTime = Math.max(
      0,
      Math.min(duration || Number.MAX_SAFE_INTEGER, player.currentTime + seconds)
    );
    player.currentTime = nextTime;
  };

  const backParams = new URLSearchParams({
    page: String(page),
    safety,
    q
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-pulse-900">Video Player</h1>
        <Link
          to={`/video-library?${backParams.toString()}`}
          className="rounded-md border border-lavender-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-lavender-50"
        >
          Back to library
        </Link>
      </div>

      {error ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          {error}
        </p>
      ) : null}

      {loading ? <p className="py-12 text-center text-sm text-slate-500">Loading…</p> : null}

      {!loading && !error && selectedVideo ? (
        <section className="rounded-xl border border-lavender-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-pulse-900">
                {selectedVideo.title?.trim() || selectedVideo.fileName}
              </h2>
              <p className="text-xs text-slate-500">{selectedVideo.fileName}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="group relative aspect-video overflow-hidden rounded-lg bg-black">
                <video
                  ref={playerRef}
                  key={selectedVideo._id}
                  src={selectedVideo.s3Url}
                  poster={selectedVideo.thumbnailUrl ?? undefined}
                  controls
                  autoPlay
                  preload="metadata"
                  playsInline
                  className="h-full w-full"
                  onEnded={() => {
                    if (selectedIndex < rows.length - 1) {
                      playVideoAt(selectedIndex + 1);
                    }
                  }}
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="pointer-events-auto flex items-center gap-2 rounded-full px-3 py-2 opacity-0  transition group-hover:opacity-100 group-focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => playVideoAt(selectedIndex - 1)}
                      disabled={selectedIndex <= 0}
                      aria-label="Previous video"
                      title="Previous video"
                      className="rounded-full bg-white/90 p-2 text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <IconPrevTrack />
                    </button>
                    <button
                      type="button"
                      onClick={() => skipBy(-10)}
                      aria-label="Back 10 seconds"
                      title="Back 10s"
                      className="rounded-full bg-white/90 p-2 text-slate-900"
                    >
                      <IconReplay10 />
                    </button>
                    <button
                      type="button"
                      onClick={() => skipBy(10)}
                      aria-label="Forward 10 seconds"
                      title="Forward 10s"
                      className="rounded-full bg-white/90 p-2 text-slate-900"
                    >
                      <IconForward10 />
                    </button>
                    <button
                      type="button"
                      onClick={() => playVideoAt(selectedIndex + 1)}
                      disabled={selectedIndex < 0 || selectedIndex >= rows.length - 1}
                      aria-label="Next video"
                      title="Next video"
                      className="rounded-full bg-white/90 p-2 text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <IconNextTrack />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <aside className="rounded-lg border border-lavender-200">
              <div className="border-b border-lavender-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Videos on this page
              </div>
              <div className="max-h-[360px] overflow-auto p-2">
                {rows.map((v) => {
                  const active = v._id === selectedVideoId;
                  return (
                    <button
                      key={v._id}
                      type="button"
                      onClick={() => setSelectedVideoId(v._id)}
                      className={`mb-2 flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left text-sm ${
                        active
                          ? 'border-pulse-400 bg-lavender-50 text-pulse-900'
                          : 'border-lavender-200 bg-white text-slate-700 hover:bg-lavender-50'
                      }`}
                    >
                      <div className="h-12 w-20 shrink-0 overflow-hidden rounded bg-black">
                        <video
                          src={v.s3Url}
                          poster={v.thumbnailUrl ?? undefined}
                          preload="metadata"
                          muted
                          playsInline
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="line-clamp-1 font-medium">{v.title?.trim() || v.fileName}</p>
                        <p className="line-clamp-1 text-xs text-slate-500">{v.fileName}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        </section>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">No videos found for this selection.</p>
      ) : null}
    </div>
  );
}
