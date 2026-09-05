import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  CheckCircle2,
  Clock,
  Maximize,
  Minimize,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export function resolveMediaPath(path?: string): string | undefined {
  if (!path) return undefined;
  if (
    path.startsWith('app-media://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:') ||
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }
  return `app-media://${path.replace(/^[/\\]+/, '')}`;
}

interface VideoPlayerProps {
  mediaPath?: string;
  initialPositionSeconds?: number;
  onProgressUpdate?: (positionSeconds: number, isCompleted: boolean) => void;
  onComplete?: () => void;
  onNextLesson?: () => void;
  title?: string;
  traineeName?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  mediaPath,
  initialPositionSeconds = 0,
  onProgressUpdate,
  onComplete,
  onNextLesson,
  traineeName = 'Active Learner'
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [useCanvasFallback, setUseCanvasFallback] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-advance modal countdown
  const [showAutoAdvance, setShowAutoAdvance] = useState(false);
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState(5);

  // Anti-piracy dynamic floating watermark (Graphy-Standard)
  const [watermarkPos, setWatermarkPos] = useState({ top: '15%', left: '20%' });

  const defaultDuration = 720; // 12 mins fallback
  const resolvedSrc = resolveMediaPath(mediaPath);

  // 1. Watermark position randomizer (Every 15 seconds)
  useEffect(() => {
    const updateWatermark = () => {
      const topPct = Math.floor(Math.random() * 65) + 12; // 12% to 77%
      const leftPct = Math.floor(Math.random() * 55) + 10; // 10% to 65%
      setWatermarkPos({ top: `${topPct}%`, left: `${leftPct}%` });
    };

    updateWatermark();
    const interval = setInterval(updateWatermark, 15000);
    return () => clearInterval(interval);
  }, []);

  // 2. Playback position restoration on mount / lesson change (TASK 3)
  useEffect(() => {
    if (initialPositionSeconds > 0 && videoRef.current) {
      videoRef.current.currentTime = initialPositionSeconds;
      setCurrentTime(initialPositionSeconds);
    }
  }, [initialPositionSeconds]);

  // 3. Auto-advance countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showAutoAdvance && autoAdvanceSeconds > 0) {
      timer = setTimeout(() => {
        setAutoAdvanceSeconds((prev) => prev - 1);
      }, 1000);
    } else if (showAutoAdvance && autoAdvanceSeconds === 0) {
      setShowAutoAdvance(false);
      if (onNextLesson) {
        onNextLesson();
      }
    }
    return () => clearTimeout(timer);
  }, [showAutoAdvance, autoAdvanceSeconds, onNextLesson]);

  // 4. Anti-skimming progress tracking (>=85% watched)
  useEffect(() => {
    const activeDur = duration > 0 ? duration : defaultDuration;
    const requiredWatchTime = activeDur * 0.85;

    if (watchedSeconds >= requiredWatchTime && !hasCompleted) {
      setHasCompleted(true);
      if (onProgressUpdate) {
        onProgressUpdate(currentTime, true);
      }
      if (onComplete) {
        onComplete();
      }
    }
  }, [watchedSeconds, duration, currentTime, hasCompleted, onProgressUpdate, onComplete]);

  // 5. Trigger completion flow & auto-advance
  const triggerCompletionFlow = useCallback(() => {
    if (!hasCompleted) {
      setHasCompleted(true);
      if (onComplete) onComplete();
    }
    if (onNextLesson && !showAutoAdvance) {
      setAutoAdvanceSeconds(5);
      setShowAutoAdvance(true);
    }
  }, [hasCompleted, onComplete, onNextLesson, showAutoAdvance]);

  // 6. Synthetic canvas rendering if no offline video file exists
  useEffect(() => {
    let animationFrameId: number;
    let lastTimestamp = performance.now();

    const renderSyntheticVideo = (timestamp: number) => {
      const delta = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      if (isPlaying && useCanvasFallback) {
        setCurrentTime((prev) => {
          const next = prev + delta * playbackRate;
          if (next >= defaultDuration) {
            setIsPlaying(false);
            triggerCompletionFlow();
            return defaultDuration;
          }
          return next;
        });
        setWatchedSeconds((prev) => prev + delta);
      }

      const canvas = canvasRef.current;
      if (canvas && useCanvasFallback) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;

          // Dark industrial background
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, w, h);

          // Grid
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          for (let x = 0; x < w; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
          }
          for (let y = 0; y < h; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }

          // Orange telemetry waveform
          const time = timestamp * 0.002;
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let x = 0; x < w; x += 4) {
            const y = h / 2 + Math.sin(x * 0.015 + time) * 45 + Math.cos(x * 0.03 - time * 0.5) * 20;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Text overlay
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 15px monospace';
          ctx.fillText('INFINYT 3D HIGH-PRECISION CALIBRATION STREAM', 25, 40);

          ctx.fillStyle = '#cbd5e1';
          ctx.font = '12px monospace';
          ctx.fillText(`TIMECODE: ${Math.floor(currentTime)}s | STATUS: STREAMING`, 25, 65);
          ctx.fillText(`NOZZLE TEMP: ${(285 + Math.sin(time * 2) * 1.5).toFixed(1)}°C | BED: 110.0°C`, 25, 85);
          ctx.fillText(`FEEDRATE: ${(120 + Math.cos(time) * 5).toFixed(1)} mm/s | Z-OFFSET: 0.20 mm`, 25, 105);

          // Center target
          ctx.strokeStyle = 'rgba(234, 88, 12, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, 70, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(renderSyntheticVideo);
    };

    if (useCanvasFallback) {
      animationFrameId = requestAnimationFrame(renderSyntheticVideo);
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, useCanvasFallback, playbackRate, currentTime, triggerCompletionFlow]);

  // 7. Toggle Play / Pause
  const togglePlay = useCallback(() => {
    if (useCanvasFallback) {
      setIsPlaying((prev) => !prev);
      return;
    }

    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
        if (onProgressUpdate) {
          onProgressUpdate(videoRef.current.currentTime, hasCompleted);
        }
      } else {
        videoRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            setUseCanvasFallback(true);
            setIsPlaying(true);
          });
      }
    }
  }, [isPlaying, useCanvasFallback, onProgressUpdate, hasCompleted]);

  // 8. Skip forward/backward
  const handleSkip = useCallback((seconds: number) => {
    const activeDur = duration > 0 ? duration : defaultDuration;
    const newTime = Math.max(0, Math.min(activeDur, currentTime + seconds));
    setCurrentTime(newTime);
    if (videoRef.current && !useCanvasFallback) {
      videoRef.current.currentTime = newTime;
    }
    if (onProgressUpdate) {
      onProgressUpdate(newTime, hasCompleted);
    }
  }, [currentTime, duration, useCanvasFallback, onProgressUpdate, hasCompleted]);

  // 9. Mute toggle
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted((prev) => !prev);
  }, [isMuted]);

  // 10. Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // 11. Keyboard Shortcuts (TASK 4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in form controls
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSkip(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSkip(5);
          break;
        case 'KeyJ':
          e.preventDefault();
          handleSkip(-10);
          break;
        case 'KeyL':
          e.preventDefault();
          handleSkip(10);
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, handleSkip, toggleMute, toggleFullscreen]);

  // 12. Native HTML5 Video Event Handlers (TASK 1)
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const curr = videoRef.current.currentTime;
      setCurrentTime(curr);
      setWatchedSeconds((prev) => prev + 0.25);
      if (onProgressUpdate) {
        onProgressUpdate(curr, hasCompleted);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      if (initialPositionSeconds > 0) {
        videoRef.current.currentTime = initialPositionSeconds;
        setCurrentTime(initialPositionSeconds);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    triggerCompletionFlow();
  };

  const handleError = () => {
    setUseCanvasFallback(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current && !useCanvasFallback) {
      videoRef.current.currentTime = targetTime;
    }
    if (onProgressUpdate) {
      onProgressUpdate(targetTime, hasCompleted);
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
    }
    setIsMuted(newVol === 0);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const activeDur = duration > 0 ? duration : defaultDuration;
  const watchPercent = Math.min(100, Math.round((watchedSeconds / (activeDur * 0.85)) * 100));

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col focus:outline-none select-none relative"
    >
      {/* Video Viewport Stage */}
      <div className="relative aspect-video bg-slate-950 flex items-center justify-center group overflow-hidden">
        {useCanvasFallback ? (
          <canvas
            ref={canvasRef}
            width={854}
            height={480}
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlay}
          />
        ) : (
          <video
            ref={videoRef}
            src={resolvedSrc}
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            onError={handleError}
          />
        )}

        {/* Dynamic Anti-Piracy Watermark (TASK 4) */}
        <div
          style={{ top: watermarkPos.top, left: watermarkPos.left }}
          className="absolute z-20 pointer-events-none transition-all duration-1000 ease-in-out opacity-20"
        >
          <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-md text-[10px] font-mono tracking-wider border border-white/10 shadow-lg">
            [Infinyt 3D • Licensed to: {traineeName || 'Active Learner'} • {new Date().toLocaleDateString()}]
          </div>
        </div>

        {/* Center Play Button Overlay on Pause */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute w-16 h-16 rounded-full btn-brand-gradient text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform z-20 backdrop-blur-sm"
          >
            <Play className="w-7 h-7 ml-1" fill="currentColor" />
          </button>
        )}

        {/* Anti-skimming watch requirement badge */}
        <div className="absolute top-3 right-3 bg-white/90 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center space-x-2 text-xs backdrop-blur-md z-20 shadow-sm">
          {hasCompleted ? (
            <div className="flex items-center space-x-1.5 text-emerald-700 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Watch Requirement Satisfied (≥85%)</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 text-orange-800 font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5 text-orange-600 animate-spin" />
              <span>Watch Progress: {watchPercent}% (85% required)</span>
            </div>
          )}
        </div>

        {/* Auto-Advance Overlay Prompt (TASK 4 / 5) */}
        {showAutoAdvance && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md z-30 flex items-center justify-center p-6 animate-fadeIn">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center max-w-md shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Unit Completed!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Next lecture in{' '}
                  <span className="font-bold font-mono text-orange-600 text-sm">
                    {autoAdvanceSeconds}s
                  </span>
                  ...
                </p>
              </div>

              <div className="flex justify-center space-x-3 pt-2">
                <button
                  onClick={() => setShowAutoAdvance(false)}
                  className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowAutoAdvance(false);
                    if (onNextLesson) onNextLesson();
                  }}
                  className="px-6 py-2 rounded-full btn-brand-gradient text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-orange-500/20"
                >
                  <span>Play Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Infinyt 3D Orange & White Playback Control Bar */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-2.5">
        {/* Scrubber Slider */}
        <div className="flex items-center space-x-3">
          <span className="text-[11px] font-mono text-slate-500 w-12 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 relative flex items-center">
            <input
              type="range"
              min={0}
              max={activeDur}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600 focus:outline-none"
            />
          </div>
          <span className="text-[11px] font-mono text-slate-500 w-12">
            {formatTime(activeDur)}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-xl bg-white hover:bg-orange-50 text-slate-900 hover:text-orange-600 flex items-center justify-center transition-colors border border-slate-200 shadow-sm"
              title={isPlaying ? 'Pause (Space / K)' : 'Play (Space / K)'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            {/* Skip -10s */}
            <button
              onClick={() => handleSkip(-10)}
              className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors border border-slate-200 shadow-sm"
              title="Rewind 10s (J / Left Arrow -5s)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Skip +10s */}
            <button
              onClick={() => handleSkip(10)}
              className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors border border-slate-200 shadow-sm"
              title="Fast-forward 10s (L / Right Arrow +5s)"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <button
                onClick={toggleMute}
                className="text-slate-500 hover:text-orange-600"
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-500" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
              />
            </div>
          </div>

          {/* Right Controls: Speed toggles, Fullscreen & Status */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 text-xs font-mono shadow-sm">
              {[0.75, 1, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  onClick={() => changePlaybackRate(rate)}
                  className={`px-2 py-0.5 rounded-lg transition-colors ${
                    playbackRate === rate
                      ? 'bg-orange-500 text-white font-bold'
                      : 'text-slate-600 hover:text-orange-600'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            <button
              onClick={toggleFullscreen}
              className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center border border-slate-200 shadow-sm transition-colors"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>

            {hasCompleted && (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-mono font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>COMPLETED</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
