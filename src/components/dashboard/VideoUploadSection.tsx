import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { getStoredUser } from '../../lib/auth';
import { hasClearance, PERMISSIONS } from '../../lib/clearances';
import { getVideoSocket } from '../../lib/socket';
import type { UploadAcceptedResponse, VideoJobSocketPayload } from '../../types/video';

type Phase = 'idle' | 'sending' | 'processing' | 'done' | 'error';

function jobStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Queued for processing…';
    case 'analyzing':
      return 'Uploading to storage and scanning content…';
    case 'uploading':
      return 'Finalizing (poster & library)…';
    case 'completed':
      return 'Processing complete.';
    case 'failed':
      return 'Processing failed.';
    default:
      return status;
  }
}

export function VideoUploadSection() {
  const user = getStoredUser();
  const canUpload = user ? hasClearance(user.clearanceLevel, PERMISSIONS.UPLOAD_VIDEO) : false;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [savedAsTitle, setSavedAsTitle] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [httpPercent, setHttpPercent] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('pending');
  const [jobProgress, setJobProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setPhase('idle');
    setHttpPercent(0);
    setJobId(null);
    setJobStatus('pending');
    setJobProgress(0);
    setErrorMessage(null);
    setFile(null);
    setTitle('');
    setDescription('');
    setSavedAsTitle(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  useEffect(() => {
    if (!jobId) return;
    const socket = getVideoSocket();
    socket.emit('subscribe:job', jobId);

    const onUpdate = (payload: VideoJobSocketPayload) => {
      const incomingId = String(payload.jobId);
      if (incomingId !== jobId) return;
      if (
        user?.tenantId &&
        payload.tenantId != null &&
        String(payload.tenantId) !== String(user.tenantId)
      ) {
        return;
      }
      setJobStatus(payload.status);
      if (typeof payload.progress === 'number') {
        setJobProgress(Math.min(100, Math.max(0, payload.progress)));
      }
      if (payload.errorMessage) setErrorMessage(payload.errorMessage);
      if (payload.status === 'completed') {
        setPhase('done');
        setJobProgress(100);
      }
      if (payload.status === 'failed') {
        setPhase('error');
      }
    };

    socket.on('video:job:update', onUpdate);
    return () => {
      socket.off('video:job:update', onUpdate);
    };
  }, [jobId, user?.tenantId]);

  /** One-shot sync if the tab opened mid-job or the socket missed the first events (no interval). */
  useEffect(() => {
    if (!jobId) return;
    if (phase !== 'processing') return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<{
          data: { status: string; errorMessage?: string | null };
        }>(`/videos/upload-jobs/${jobId}`);
        if (cancelled) return;
        const s = data.data.status;
        if (s === 'completed' || s === 'failed') {
          setJobStatus(s);
          if (data.data.errorMessage) setErrorMessage(data.data.errorMessage);
          if (s === 'completed') {
            setPhase('done');
            setJobProgress(100);
          } else {
            setPhase('error');
          }
        }
      } catch {
        /* socket is primary; ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId, phase]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canUpload || !file) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage('Please enter a video title.');
      return;
    }

    setErrorMessage(null);
    setPhase('sending');
    setHttpPercent(0);
    setJobProgress(0);
    setJobStatus('pending');

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', trimmedTitle);
      if (description.trim()) formData.append('description', description.trim());

      const { data } = await api.post<UploadAcceptedResponse>('/videos/upload', formData, {
        timeout: 600_000,
        onUploadProgress: (ev) => {
          if (ev.total) {
            setHttpPercent(Math.round((ev.loaded / ev.total) * 100));
          }
        }
      });

      const id = String(data.data.jobId);
      setJobId(id);
      setJobStatus(data.data.status);
      setSavedAsTitle(
        data.data.titleAdjusted && data.data.title ? data.data.title.trim() : null
      );
      setPhase('processing');
      setJobProgress(data.data.status === 'pending' ? 8 : 15);
    } catch (err: unknown) {
      setPhase('error');
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message)
          : 'Upload failed';
      setErrorMessage(msg || 'Upload failed');
    }
  }

  const displayPercent =
    phase === 'sending'
      ? Math.min(99, Math.round(httpPercent * 0.22))
      : phase === 'processing'
        ? Math.max(Math.round(httpPercent * 0.22), jobProgress)
        : phase === 'done'
          ? 100
          : 0;

  if (!canUpload) {
    return (
      <section className="rounded-2xl border border-lavender-200 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-pulse-900">Upload video</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your role does not include upload permission. Ask an admin for the UPLOAD_VIDEO clearance.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-lavender-200 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
      <h2 className="text-lg font-semibold text-pulse-900">Upload video</h2>
      <p className="mt-1 text-sm text-slate-600">
        File is sent to the API, then processed in the background. Status updates arrive over the
        socket (no repeated polling).
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label htmlFor="video-title" className="mb-1 block text-sm font-medium text-slate-700">
            Title <span className="text-red-600">*</span>
          </label>
          <input
            id="video-title"
            type="text"
            name="title"
            required
            value={title}
            onChange={(ev) => setTitle(ev.target.value)}
            className="w-full rounded-lg border border-lavender-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-pulse-500 focus:ring-2 focus:ring-pulse-500/25"
            placeholder="e.g. Q1 kickoff"
            disabled={phase === 'sending' || phase === 'processing'}
          />
        </div>

        <div>
          <label
            htmlFor="video-description"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Description <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="video-description"
            name="description"
            rows={3}
            value={description}
            onChange={(ev) => setDescription(ev.target.value)}
            className="w-full rounded-lg border border-lavender-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-pulse-500 focus:ring-2 focus:ring-pulse-500/25"
            placeholder="Short summary or notes"
            disabled={phase === 'sending' || phase === 'processing'}
          />
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="sr-only"
            id="video-file"
            onChange={(ev) => {
              const f = ev.target.files?.[0];
              setFile(f ?? null);
            }}
            disabled={phase === 'sending' || phase === 'processing'}
          />
          <label
            htmlFor="video-file"
            className="w-full inline-flex cursor-pointer rounded-lg border border-dashed border-lavender-300 bg-lavender-50/80 px-4 py-8 text-center text-sm text-slate-600 transition hover:border-pulse-400 hover:bg-lavender-50"
          >
            <span className="w-full">
              {file ? (
                <>
                  <span className="font-medium text-pulse-900">{file.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </>
              ) : (
                <>Click to choose a video file</>
              )}
            </span>
          </label>
        </div>

        {savedAsTitle && (
          <p className="rounded-lg bg-lavender-50 px-3 py-2 text-sm text-pulse-900 ring-1 ring-lavender-200">
            Title already in use — saved as{' '}
            <span className="font-semibold">{savedAsTitle}</span>.
          </p>
        )}

        {(phase === 'sending' || phase === 'processing' || phase === 'done') && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>
                {phase === 'sending' && 'Uploading to server…'}
                {phase === 'processing' && jobStatusLabel(jobStatus)}
                {phase === 'done' && 'Done'}
              </span>
              <span>{displayPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-lavender-100">
              <div
                className="h-full rounded-full bg-pulse-600 transition-[width] duration-300 ease-out"
                style={{ width: `${displayPercent}%` }}
              />
            </div>
          </div>
        )}

        {errorMessage && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-100">
            {errorMessage}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={
              !file || !title.trim() || phase === 'sending' || phase === 'processing'
            }
            className="rounded-lg bg-pulse-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pulse-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase === 'sending' || phase === 'processing' ? 'Working…' : 'Upload'}
          </button>
          {(phase === 'done' || phase === 'error') && (
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-lavender-300 bg-white px-4 py-2.5 text-sm font-medium text-pulse-800 hover:bg-lavender-50"
            >
              Upload another
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
