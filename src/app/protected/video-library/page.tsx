import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { VideoPreviewMedia } from '../../../components/video/VideoPreviewMedia';
import { api } from '../../../lib/api';
import { getVideoSocket } from '../../../lib/socket';
import type { PaginatedResponse, VideoRecord } from '../../../types/video';

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

function VideoCard({
  v,
  playerHref
}: {
  v: VideoRecord;
  playerHref: string;
}) {
  const title = v.title?.trim() || v.fileName;
  const durationText = formatDuration(v.durationSeconds);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-lavender-200 bg-white shadow-sm transition hover:border-pulse-300 hover:shadow-md">
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

export default function VideoLibraryPage() {
  const PAGE_SIZE = 9;
  const [rows, setRows] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [safetyFilter, setSafetyFilter] = useState<'all' | 'safe' | 'flagged'>('all');
  const [searchText, setSearchText] = useState('');
  const [appliedSafetyFilter, setAppliedSafetyFilter] = useState<'all' | 'safe' | 'flagged'>(
    'all'
  );
  const [appliedSearchText, setAppliedSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchParams] = useSearchParams();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        safety: appliedSafetyFilter,
        q: appliedSearchText.trim()
      });
      const { data } = await api.get<{ data: PaginatedResponse<VideoRecord> }>(`/videos?${params}`);
      setRows(data.data.items ?? []);
      setTotal(data.data.total ?? 0);
      setTotalPages(Math.max(1, data.data.totalPages ?? 1));
    } catch {
      setError('Could not load videos.');
      setRows([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, appliedSafetyFilter, appliedSearchText]);

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

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const hasPendingChanges =
    safetyFilter !== appliedSafetyFilter || searchText.trim() !== appliedSearchText.trim();
  const hasActiveFilters = appliedSafetyFilter !== 'all' || appliedSearchText.trim().length > 0;

  const applyFilters = () => {
    setPage(1);
    setAppliedSafetyFilter(safetyFilter);
    setAppliedSearchText(searchText.trim());
  };

  const resetFilters = () => {
    setSafetyFilter('all');
    setSearchText('');
    setAppliedSafetyFilter('all');
    setAppliedSearchText('');
    setPage(1);
  };

  useEffect(() => {
    const fromUrlPage = Number(searchParams.get('page') ?? '');
    const fromUrlSafety = searchParams.get('safety');
    const fromUrlQ = searchParams.get('q') ?? '';

    if (Number.isFinite(fromUrlPage) && fromUrlPage > 0) {
      setPage(fromUrlPage);
    }
    if (fromUrlSafety === 'all' || fromUrlSafety === 'safe' || fromUrlSafety === 'flagged') {
      setSafetyFilter(fromUrlSafety);
      setAppliedSafetyFilter(fromUrlSafety);
    }
    setSearchText(fromUrlQ);
    setAppliedSearchText(fromUrlQ);
    // one-time hydrate from URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-pulse-900">Video Library</h1>
      </div>

      <div className="rounded-xl border border-lavender-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Safety status
              <select
                value={safetyFilter}
                onChange={(e) =>
                  setSafetyFilter(e.target.value as 'all' | 'safe' | 'flagged')
                }
                className="rounded-lg border border-lavender-300 px-3 py-2 text-sm text-slate-900 outline-none ring-pulse-500 focus:ring-2"
              >
                <option value="all">All</option>
                <option value="safe">Safe</option>
                <option value="flagged">Flagged</option>
              </select>
            </label>
            <label className="md:col-span-2 flex flex-col gap-1 text-sm text-slate-700">
              Search (date, size, duration, title, file)
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="e.g. 2026, 12.50 mb, 02:15"
                className="rounded-lg border border-lavender-300 px-3 py-2 text-sm text-slate-900 outline-none ring-pulse-500 placeholder:text-slate-400 focus:ring-2"
              />
            </label>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={applyFilters}
            disabled={!hasPendingChanges}
            className="rounded-lg bg-pulse-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-pulse-800"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters && !hasPendingChanges}
            className="rounded-lg border border-lavender-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-lavender-50"
          >
            Reset filters
          </button>
          {hasPendingChanges ? (
            <span className="text-xs text-slate-500">You have unapplied changes</span>
          ) : null}
          {hasActiveFilters && !hasPendingChanges ? (
            <span className="text-xs text-slate-500">Filters applied</span>
          ) : null}
          </div>
        </div>

      {error && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          {error}
        </p>
      )}

      {loading && (
        <p className="text-center text-sm text-slate-500 py-12">Loading…</p>
      )}

      {!loading && !error && total === 0 && (
        <p className="text-center text-sm text-slate-500 py-12">
          {hasActiveFilters ? 'No videos match your applied filters.' : 'No videos yet.'}
        </p>
      )}

      {!loading && !error && total > 0 && rows.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-12">No videos on this page.</p>
      )}

      {!loading && !error && total > 0 && (
        <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
          <p>
            Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-lavender-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-lavender-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((v) => (
            <VideoCard
              key={v._id}
              v={v}
              playerHref={`/video-player?videoId=${encodeURIComponent(v._id)}&page=${page}&limit=${PAGE_SIZE}&safety=${appliedSafetyFilter}&q=${encodeURIComponent(appliedSearchText)}`}
            />
          ))}
        </div>
      )}

      {!loading && !error && total > 0 && (
        <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
          <p>
            Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-lavender-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-lavender-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
