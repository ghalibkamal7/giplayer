import React from 'react';
import { Sun, Volume2, VolumeX, FastForward, Rewind } from 'lucide-react';
import { PlayerGestureState } from '../../types';

interface GestureOverlayProps {
  gestureState: PlayerGestureState;
  doubleTapEffect: 'left' | 'right' | null;
  seekInterval: number;
}

export const GestureOverlay: React.FC<GestureOverlayProps> = ({
  gestureState,
  doubleTapEffect,
  seekInterval,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
      {/* Active Gesture HUD Card */}
      {gestureState.type !== 'none' && (
        <div className="bg-black/75 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 flex flex-col items-center gap-3 shadow-2xl animate-fade-in min-w-[160px]">
          {gestureState.type === 'brightness' && (
            <>
              <Sun className="w-8 h-8 text-amber-400 animate-pulse" />
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-75"
                  style={{ width: `${Math.min(100, (gestureState.value / 1.5) * 100)}%` }}
                />
              </div>
              <span className="text-sm font-semibold tracking-wider text-amber-300">
                {gestureState.displayValue}
              </span>
            </>
          )}

          {gestureState.type === 'volume' && (
            <>
              {gestureState.value === 0 ? (
                <VolumeX className="w-8 h-8 text-rose-400" />
              ) : (
                <Volume2 className="w-8 h-8 text-primary-400" />
              )}
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary-400 h-full rounded-full transition-all duration-75"
                  style={{ width: `${Math.min(100, gestureState.value * 100)}%` }}
                />
              </div>
              <span className="text-sm font-semibold tracking-wider text-primary-300">
                {gestureState.displayValue}
              </span>
            </>
          )}

          {gestureState.type === 'seek' && (
            <>
              <div className="flex items-center gap-2 text-primary-400">
                <FastForward className="w-8 h-8 animate-pulse" />
              </div>
              <span className="text-lg font-mono font-bold text-white tracking-wide">
                {gestureState.displayValue}
              </span>
            </>
          )}
        </div>
      )}

      {/* Double Tap Ripple Indicators */}
      {doubleTapEffect === 'left' && (
        <div className="absolute left-12 bg-black/60 backdrop-blur-sm p-5 rounded-full border border-primary-500/30 flex flex-col items-center gap-1 animate-ping text-white">
          <Rewind className="w-8 h-8 text-primary-400 fill-primary-400" />
          <span className="text-xs font-bold font-mono">-{seekInterval}s</span>
        </div>
      )}

      {doubleTapEffect === 'right' && (
        <div className="absolute right-12 bg-black/60 backdrop-blur-sm p-5 rounded-full border border-primary-500/30 flex flex-col items-center gap-1 animate-ping text-white">
          <FastForward className="w-8 h-8 text-primary-400 fill-primary-400" />
          <span className="text-xs font-bold font-mono">+{seekInterval}s</span>
        </div>
      )}
    </div>
  );
};
