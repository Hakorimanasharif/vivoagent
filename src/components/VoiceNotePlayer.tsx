import { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

type Props = {
  src: string;
  isSent?: boolean;
  className?: string;
};

export function VoiceNotePlayer({ src, isSent, className }: Props) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const [tag, setTag] = useState<'video' | 'audio'>('video');
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setTag('video');
    setFailed(false);
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
  }, [src]);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el || failed) return;

    const onMeta = () => setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    const onTime = () => setCurrent(el.currentTime);
    const onEnd = () => {
      setPlaying(false);
      el.currentTime = 0;
      setCurrent(0);
    };

    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('durationchange', onMeta);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnd);
    return () => {
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('durationchange', onMeta);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnd);
    };
  }, [src, tag, failed]);

  const toggle = async () => {
    const el = mediaRef.current;
    if (!el || failed) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      return;
    }
    try {
      await el.play();
      setPlaying(true);
    } catch {
      if (tag === 'video') {
        setTag('audio');
        setPlaying(false);
      } else {
        setFailed(true);
        setPlaying(false);
      }
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = mediaRef.current;
    if (!el || !duration || failed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const p = Math.max(0, Math.min(1, x / rect.width));
    el.currentTime = p * duration;
    setCurrent(p * duration);
  };

  const barBg = isSent ? 'bg-white/35' : 'bg-[#01152d]/15';
  const barFill = isSent ? 'bg-white' : 'bg-[#b38b43]';
  const timeCls = isSent ? 'text-white/85' : 'text-muted-foreground';
  const btnCls = isSent
    ? 'bg-white/25 text-white hover:bg-white/35'
    : 'bg-[#01152d]/12 text-[#01152d] hover:bg-[#01152d]/18 dark:bg-white/10 dark:text-white';

  return (
    <div className={cn('flex items-center gap-2.5 min-w-[200px] max-w-[280px] pt-3', className)}>
      {!failed && tag === 'video' && (
        <video
          key={`v-${src}`}
          ref={mediaRef}
          src={src}
          playsInline
          preload="metadata"
          className="hidden"
          onError={() => setTag('audio')}
        />
      )}
      {!failed && tag === 'audio' && (
        <audio
          key={`a-${src}`}
          ref={mediaRef}
          src={src}
          preload="metadata"
          crossOrigin="anonymous"
          className="hidden"
          onError={() => setFailed(true)}
        />
      )}

      {failed ? (
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className={cn('text-xs font-medium underline underline-offset-2', isSent ? 'text-white' : 'text-[#01152d]')}
        >
          Fungura ubutumwa bw&apos;ijwi
        </a>
      ) : (
        <>
          <button
            type="button"
            onClick={() => void toggle()}
            className={cn('shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95', btnCls)}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause className="w-4 h-4" strokeWidth={2.5} /> : <Play className="w-4 h-4 pl-0.5" strokeWidth={2.5} />}
          </button>
          <div className="flex-1 min-w-0 space-y-1">
            <div className={cn('h-2 rounded-full cursor-pointer', barBg)} onClick={seek} role="presentation">
              <div className={cn('h-full rounded-full transition-[width] duration-150', barFill)} style={{ width: `${duration ? (current / duration) * 100 : 0}%` }} />
            </div>
            <div className={cn('text-[10px] tabular-nums font-medium', timeCls)}>
              {formatTime(current)} · {formatTime(duration)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
