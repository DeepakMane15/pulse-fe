import { useEffect, useRef, useState } from 'react';

type VideoPreviewMediaProps = {
  s3Url: string;
  thumbnailUrl?: string | null;
  /** Accessible label (e.g. video title). */
  label: string;
  /** Defer loading the video until the block is near the viewport (saves bandwidth). */
  lazyVideo?: boolean;
  className?: string;
};

function nudgeToPreviewFrame(video: HTMLVideoElement) {
  const d = video.duration;
  if (!Number.isFinite(d) || d <= 0) return;
  const t = Math.min(0.75, Math.max(0.05, d * 0.02));
  try {
    video.currentTime = t;
  } catch {
    /* seek may throw on some streams */
  }
}

/**
 * YouTube-style preview: prefer server-generated JPEG; otherwise load the video with
 * `preload="metadata"` and seek slightly in so the browser paints a real frame (no extra upload).
 */
export function VideoPreviewMedia({
  s3Url,
  thumbnailUrl,
  label,
  lazyVideo = true,
  className = ''
}: VideoPreviewMediaProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(!lazyVideo);
  const [imgFailed, setImgFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    if (!lazyVideo) return;
    const el = rootRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: '120px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [lazyVideo]);

  const useImage = Boolean(thumbnailUrl) && !imgFailed;
  const useVideo = !useImage && Boolean(s3Url) && !videoFailed && inView;

  return (
    <div ref={rootRef} className={`relative h-full w-full bg-black ${className}`}>
      {useImage ? (
        <img
          src={thumbnailUrl!}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : null}

      {useVideo ? (
        <video
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
          src={s3Url}
          aria-label={label}
          onLoadedMetadata={(e) => nudgeToPreviewFrame(e.currentTarget)}
          onLoadedData={(e) => nudgeToPreviewFrame(e.currentTarget)}
          onError={() => setVideoFailed(true)}
        />
      ) : null}

      {!useImage && !useVideo ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-pulse-900/40 to-lavender-900/30 text-white/90">
          <svg className="h-10 w-10 opacity-90" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7L8 5z" />
          </svg>
          {(videoFailed || imgFailed) && (
            <span className="px-2 text-center text-[11px] font-medium text-white/85">
              Preview unavailable (S3 URL or CORS)
            </span>
          )}
          {!s3Url && (
            <span className="px-2 text-center text-[11px] font-medium text-white/85">No video URL</span>
          )}
        </div>
      ) : null}

      {/* YouTube-like play affordance (decorative; parent usually owns the link). */}
      {(useImage || useVideo) && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/50 via-transparent to-black/20"
          aria-hidden
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-pulse-700 shadow-lg ring-1 ring-black/10">
            <svg className="ml-0.5 h-7 w-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          </span>
        </div>
      )}
    </div>
  );
}
