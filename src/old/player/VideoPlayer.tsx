import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { MediaItem, Episode, AspectRatioMode, PlayerGestureState, SubtitleTrack } from '../../types';
import { storage } from '../../services/storage';
import { audioBooster } from '../../utils/audioBoost';
import { GestureOverlay } from './GestureOverlay';
import { PlayerHeader } from './PlayerHeader';
import { PlayerControls } from './PlayerControls';
import { SubtitleDisplay } from './SubtitleDisplay';
import { ResumeToast } from './ResumeToast';
import { NextEpisodeOverlay } from './NextEpisodeOverlay';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

interface VideoPlayerProps {
  media: MediaItem;
  initialEpisode?: Episode;
  onBack: () => void;
  onNextEpisode?: (nextEp: Episode) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  media,
  initialEpisode,
  onBack,
  onNextEpisode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Current media & episode state
  const [currentEpisode, setCurrentEpisode] = useState<Episode | undefined>(initialEpisode);
  const currentVideoUrl = currentEpisode?.videoUrl || media.videoUrl;
  const currentTitle = media.title;
  const currentSubtitleInfo = currentEpisode
    ? `S${currentEpisode.seasonNumber}:E${currentEpisode.episodeNumber} — ${currentEpisode.title}`
    : media.isLive
    ? media.currentProgram
    : media.category;

  // Player state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(media.duration || 0);
  const [bufferedEnd, setBufferedEnd] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);

  // Settings & Preferences
  const [preferences, setPreferences] = useState(() => storage.getSettings());
  const [brightness, setBrightness] = useState<number>(1.0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>(preferences.aspectRatio || 'contain');
  const [audioBoost, setAudioBoost] = useState<number>(preferences.audioBoost || 1.0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(preferences.playbackSpeed || 1.0);

  // Subtitles
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>(
    currentEpisode?.subtitles || media.subtitles || []
  );
  const [activeSubtitleId, setActiveSubtitleId] = useState<string | null>(() => {
    const defaultSub = (currentEpisode?.subtitles || media.subtitles || []).find((s) => s.default);
    return defaultSub ? defaultSub.id : null;
  });
  const [subtitleOffset, setSubtitleOffset] = useState<number>(0);

  // Gesture HUD & Ripple
  const [gestureState, setGestureState] = useState<PlayerGestureState>({
    type: 'none',
    value: 0,
    displayValue: '',
  });
  const [doubleTapEffect, setDoubleTapEffect] = useState<'left' | 'right' | null>(null);

  // Modals & Overlays
  const [resumePromptTime, setResumePromptTime] = useState<number | null>(null);
  const [showNextOverlay, setShowNextOverlay] = useState<boolean>(false);
  const [showShortcuts, setShowShortcuts] = useState<boolean>(false);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const [isPipActive, setIsPipActive] = useState<boolean>(false);

  // Inactivity controls timeout
  const controlsTimeoutRef = useRef<number | null>(null);

  // Touch & Gesture Tracking
  const touchStartRef = useRef<{ x: number; y: number; time: number; handled: boolean } | null>(null);
  const lastTapRef = useRef<{ x: number; time: number } | null>(null);

  // Next episode resolution
  const getNextEpisode = useCallback((): Episode | undefined => {
    if (!media.seasons || !currentEpisode) return undefined;
    for (const season of media.seasons) {
      if (season.seasonNumber === currentEpisode.seasonNumber) {
        const nextInSeason = season.episodes.find(
          (ep) => ep.episodeNumber === currentEpisode.episodeNumber + 1
        );
        if (nextInSeason) return nextInSeason;
      } else if (season.seasonNumber === currentEpisode.seasonNumber + 1) {
        if (season.episodes.length > 0) return season.episodes[0];
      }
    }
    return undefined;
  }, [media, currentEpisode]);

  const nextEpisode = getNextEpisode();

  // Reset inactivity timer
  const triggerControlsActivity = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (!isLocked) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3500);
    }
  }, [isPlaying, isLocked]);

  // Video Source & HLS Setup
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setPlayerError(null);

    const isHlsUrl = currentVideoUrl.includes('.m3u8') || media.streamType === 'hls';

    if (isHlsUrl && Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });
      hlsRef.current = hls;

      hls.loadSource(currentVideoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setPlayerError('Stream error occurred. Retrying connection...');
              hls.destroy();
              break;
          }
        }
      });
    } else {
      video.src = currentVideoUrl;
      video.load();
    }

    // Check for saved resume position
    const saved = storage.getProgress(media.id);
    if (saved && !saved.completed && saved.currentTime > 10 && saved.currentTime < saved.duration - 10) {
      setResumePromptTime(saved.currentTime);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentVideoUrl, media.id, media.streamType]);

  // Attach Audio Booster
  useEffect(() => {
    if (videoRef.current) {
      audioBooster.attach(videoRef.current);
      audioBooster.setBoost(audioBoost);
    }
    return () => {
      audioBooster.destroy();
    };
  }, [audioBoost]);

  // Handle Play/Pause
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
    triggerControlsActivity();
  }, [triggerControlsActivity]);

  // Handle Seek
  const handleSeek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    const safeTime = Math.max(0, Math.min(video.duration || 0, time));
    video.currentTime = safeTime;
    setCurrentTime(safeTime);
    triggerControlsActivity();
  }, [triggerControlsActivity]);

  const handleSeekRelative = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    handleSeek(videoRef.current.currentTime + seconds);
  }, [handleSeek]);

  // Volume Changes
  const handleVolumeChange = useCallback((vol: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(1, vol));
    video.volume = clamped;
    video.muted = clamped === 0;
    setPreferences(storage.saveSettings({ volume: clamped, isMuted: clamped === 0 }));
  }, []);

  const handleToggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const newMuted = !video.muted;
    video.muted = newMuted;
    setPreferences(storage.saveSettings({ isMuted: newMuted }));
  }, []);

  // Fullscreen Toggle
  const handleToggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // Subtitle custom loader
  const handleLoadCustomSubtitle = (file: File) => {
    const blobUrl = URL.createObjectURL(file);
    const customSub: SubtitleTrack = {
      id: `custom-${Date.now()}`,
      label: file.name.replace(/\.[^/.]+$/, ''),
      language: 'custom',
      src: blobUrl,
      default: true,
    };
    setSubtitles((prev) => [customSub, ...prev]);
    setActiveSubtitleId(customSub.id);
  };

  // Sleep Timer Interval
  useEffect(() => {
    if (sleepTimerRemaining === null) return;
    if (sleepTimerRemaining <= 0) {
      if (videoRef.current) videoRef.current.pause();
      setIsPlaying(false);
      setSleepTimerRemaining(null);
      return;
    }

    const timer = setInterval(() => {
      setSleepTimerRemaining((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepTimerRemaining]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          handleToggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          handleToggleMute();
          break;
        case 'arrowleft':
          e.preventDefault();
          handleSeekRelative(-5);
          break;
        case 'arrowright':
          e.preventDefault();
          handleSeekRelative(5);
          break;
        case 'j':
          e.preventDefault();
          handleSeekRelative(-10);
          break;
        case 'l':
          e.preventDefault();
          handleSeekRelative(10);
          break;
        case 'arrowup':
          e.preventDefault();
          if (videoRef.current) handleVolumeChange(videoRef.current.volume + 0.05);
          break;
        case 'arrowdown':
          e.preventDefault();
          if (videoRef.current) handleVolumeChange(videoRef.current.volume - 0.05);
          break;
        case 'c':
          e.preventDefault();
          setActiveSubtitleId((prev) => (prev ? null : subtitles[0]?.id || null));
          break;
        case 'p':
          e.preventDefault();
          if (document.pictureInPictureElement) {
            document.exitPictureInPicture().catch(() => {});
          } else if (videoRef.current?.requestPictureInPicture) {
            videoRef.current.requestPictureInPicture().catch(() => {});
          }
          break;
        case 'n':
          e.preventDefault();
          if (nextEpisode && onNextEpisode) {
            onNextEpisode(nextEpisode);
          }
          break;
        case '?':
          e.preventDefault();
          setShowShortcuts((prev) => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, handleToggleFullscreen, handleToggleMute, handleSeekRelative, handleVolumeChange, subtitles, nextEpisode, onNextEpisode]);

  // Touch Gesture Listeners (Mobile MX Player Experience)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isLocked || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const now = Date.now();

    // Check double tap
    if (lastTapRef.current && now - lastTapRef.current.time < 300) {
      const containerW = containerRef.current?.clientWidth || window.innerWidth;
      const tapX = lastTapRef.current.x;

      if (tapX < containerW * 0.35) {
        // Double tap left: rewind
        handleSeekRelative(-preferences.doubleTapSeekSeconds);
        setDoubleTapEffect('left');
        setTimeout(() => setDoubleTapEffect(null), 600);
      } else if (tapX > containerW * 0.65) {
        // Double tap right: fast forward
        handleSeekRelative(preferences.doubleTapSeekSeconds);
        setDoubleTapEffect('right');
        setTimeout(() => setDoubleTapEffect(null), 600);
      } else {
        // Double tap center: play/pause
        togglePlay();
      }
      lastTapRef.current = null;
      touchStartRef.current = null;
      return;
    }

    lastTapRef.current = { x: touch.clientX, time: now };
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: now, handled: false };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isLocked || !touchStartRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const containerW = containerRef.current?.clientWidth || window.innerWidth;
    const containerH = containerRef.current?.clientHeight || window.innerHeight;

    // Minimum movement threshold
    if (Math.abs(dx) < 15 && Math.abs(dy) < 15) return;

    touchStartRef.current.handled = true;

    // Vertical vs Horizontal detection
    if (Math.abs(dy) > Math.abs(dx)) {
      // Vertical gesture: Brightness on left, Volume on right
      const deltaPercent = -dy / (containerH * 0.7);

      if (touchStartRef.current.x < containerW * 0.5 && preferences.brightnessGesture) {
        // Brightness adjustment (0.2x to 1.5x)
        const newBrightness = Math.max(0.2, Math.min(1.5, brightness + deltaPercent * 0.05));
        setBrightness(newBrightness);
        setGestureState({
          type: 'brightness',
          value: newBrightness,
          displayValue: `${Math.round((newBrightness / 1.5) * 100)}%`,
        });
      } else if (preferences.volumeGesture && videoRef.current) {
        // Volume adjustment (0% to 100%)
        const currentVol = videoRef.current.volume;
        const newVol = Math.max(0, Math.min(1, currentVol + deltaPercent * 0.03));
        handleVolumeChange(newVol);
        setGestureState({
          type: 'volume',
          value: newVol,
          displayValue: `${Math.round(newVol * 100)}%`,
        });
      }
    } else if (preferences.seekGesture && duration > 0 && !media.isLive) {
      // Horizontal seek gesture
      const seekSecs = Math.round((dx / containerW) * 90); // scrub up to 90s across screen
      const targetTime = Math.max(0, Math.min(duration, currentTime + seekSecs));
      setGestureState({
        type: 'seek',
        value: targetTime,
        displayValue: `${seekSecs > 0 ? `+${seekSecs}s` : `${seekSecs}s`} (${Math.floor(targetTime / 60)}:${String(Math.floor(targetTime % 60)).padStart(2, '0')})`,
      });
    }
  };

  const handleTouchEnd = () => {
    if (gestureState.type === 'seek' && gestureState.value > 0) {
      handleSeek(gestureState.value);
    }
    setGestureState({ type: 'none', value: 0, displayValue: '' });
    if (touchStartRef.current && !touchStartRef.current.handled) {
      setShowControls((prev) => !prev);
    }
    touchStartRef.current = null;
  };

  // Video Event Handlers
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);

    // Save playback progress periodically
    if (video.duration && !media.isLive) {
      storage.saveProgress(media.id, video.currentTime, video.duration, media, currentEpisode?.id);
    }

    // Update buffered ranges
    if (video.buffered.length > 0) {
      setBufferedEnd(video.buffered.end(video.buffered.length - 1));
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (media.duration) {
      storage.saveProgress(media.id, media.duration, media.duration, media, currentEpisode?.id);
    }
    if (nextEpisode && preferences.autoPlayNext) {
      setShowNextOverlay(true);
    }
  };

  // Aspect ratio class mapper
  const getAspectRatioClasses = (): string => {
    switch (aspectRatio) {
      case 'cover':
        return 'object-cover w-full h-full';
      case 'fill':
        return 'object-fill w-full h-full';
      case '16:9':
        return 'aspect-video object-contain w-full h-full';
      case '4:3':
        return 'aspect-[4/3] object-contain w-full h-full';
      case 'contain':
      default:
        return 'object-contain w-full h-full';
    }
  };

  const activeSubtitle = subtitles.find((s) => s.id === activeSubtitleId);

  // PiP event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnter = () => setIsPipActive(true);
    const onLeave = () => setIsPipActive(false);

    video.addEventListener('enterpictureinpicture', onEnter);
    video.addEventListener('leavepictureinpicture', onLeave);

    return () => {
      video.removeEventListener('enterpictureinpicture', onEnter);
      video.removeEventListener('leavepictureinpicture', onLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={triggerControlsActivity}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-screen bg-black overflow-hidden flex items-center justify-center select-none"
      style={{ filter: `brightness(${brightness})` }}
    >
      {/* Background Video Element */}
      <video
        ref={videoRef}
        playsInline
        crossOrigin="anonymous"
        className={`transition-all duration-150 ${getAspectRatioClasses()}`}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration || media.duration || 0);
            setIsLoading(false);
          }
        }}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onEnded={handleEnded}
        onError={() => {
          setIsLoading(false);
          setPlayerError('Playback error. Please check video source or stream format.');
        }}
      />

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs z-20 pointer-events-none">
          <div className="p-4 rounded-full bg-black/60 border border-white/10 shadow-glow-primary">
            <Loader2 className="w-10 h-10 text-primary-400 animate-spin" />
          </div>
        </div>
      )}

      {/* Error State Banner */}
      {playerError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-35 p-6 text-center">
          <AlertCircle className="w-14 h-14 text-rose-500 mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-white mb-2">Video Unavailable</h2>
          <p className="text-sm text-gray-400 max-w-md mb-6">{playerError}</p>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setPlayerError(null);
                if (videoRef.current) {
                  videoRef.current.load();
                  videoRef.current.play().catch(() => {});
                }
              }}
              className="px-5 py-2.5 bg-primary-500 hover:bg-primary-400 text-white font-bold rounded-xl flex items-center gap-2 shadow-glow-primary transition active:scale-95"
            >
              <RefreshCw className="w-4 h-4" /> Retry Stream
            </button>
            <button
              onClick={onBack}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-gray-300 font-semibold rounded-xl transition"
            >
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* Gesture HUD & Ripple effects */}
      <GestureOverlay
        gestureState={gestureState}
        doubleTapEffect={doubleTapEffect}
        seekInterval={preferences.doubleTapSeekSeconds}
      />

      {/* Subtitles Overlay */}
      <SubtitleDisplay
        subtitleUrl={activeSubtitle?.src || null}
        currentTime={currentTime}
        offset={subtitleOffset}
        preferences={preferences}
      />

      {/* Resume Prompt Toast */}
      {resumePromptTime !== null && (
        <ResumeToast
          resumeTime={resumePromptTime}
          onResume={() => {
            handleSeek(resumePromptTime);
            setResumePromptTime(null);
          }}
          onRestart={() => {
            handleSeek(0);
            setResumePromptTime(null);
          }}
          onDismiss={() => setResumePromptTime(null)}
        />
      )}

      {/* Auto-Next Episode Countdown Overlay */}
      {showNextOverlay && nextEpisode && (
        <NextEpisodeOverlay
          nextEpisode={nextEpisode}
          onPlayNext={() => {
            setShowNextOverlay(false);
            if (onNextEpisode) onNextEpisode(nextEpisode);
            setCurrentEpisode(nextEpisode);
          }}
          onCancel={() => setShowNextOverlay(false)}
        />
      )}

      {/* Header & Controls with Smooth Auto-Hide */}
      <div
        className={`transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <PlayerHeader
          title={currentTitle}
          subtitleInfo={currentSubtitleInfo}
          isLocked={isLocked}
          onToggleLock={() => setIsLocked(!isLocked)}
          onBack={onBack}
          aspectRatio={aspectRatio}
          onChangeAspectRatio={(mode) => {
            setAspectRatio(mode);
            setPreferences(storage.saveSettings({ aspectRatio: mode }));
          }}
          playbackSpeed={playbackSpeed}
          onChangeSpeed={(speed) => {
            setPlaybackSpeed(speed);
            if (videoRef.current) videoRef.current.playbackRate = speed;
            setPreferences(storage.saveSettings({ playbackSpeed: speed }));
          }}
          subtitles={subtitles}
          activeSubtitleId={activeSubtitleId}
          onSelectSubtitle={setActiveSubtitleId}
          onLoadCustomSubtitle={handleLoadCustomSubtitle}
          subtitleOffset={subtitleOffset}
          onChangeSubtitleOffset={setSubtitleOffset}
          audioBoost={audioBoost}
          onChangeAudioBoost={(b) => {
            setAudioBoost(b);
            setPreferences(storage.saveSettings({ audioBoost: b }));
          }}
          sleepTimerRemaining={sleepTimerRemaining}
          onSetSleepTimer={(mins) =>
            setSleepTimerRemaining(mins !== null ? mins * 60 : null)
          }
          isPipAvailable={Boolean(document.pictureInPictureEnabled)}
          isPipActive={isPipActive}
          onTogglePip={() => {
            if (document.pictureInPictureElement) {
              document.exitPictureInPicture().catch(() => {});
            } else if (videoRef.current?.requestPictureInPicture) {
              videoRef.current.requestPictureInPicture().catch(() => {});
            }
          }}
          onOpenShortcuts={() => setShowShortcuts(true)}
        />

        {!isLocked && (
          <PlayerControls
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            currentTime={currentTime}
            duration={duration}
            bufferedEnd={bufferedEnd}
            onSeek={handleSeek}
            volume={preferences.volume}
            isMuted={preferences.isMuted}
            onVolumeChange={handleVolumeChange}
            onToggleMute={handleToggleMute}
            onSeekRelative={handleSeekRelative}
            seekInterval={preferences.doubleTapSeekSeconds}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            hasNextEpisode={Boolean(nextEpisode)}
            onNextEpisode={() => {
              if (nextEpisode && onNextEpisode) {
                onNextEpisode(nextEpisode);
                setCurrentEpisode(nextEpisode);
              }
            }}
            isLive={media.isLive}
          />
        )}
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
};
