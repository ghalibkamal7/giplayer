import React, { useState } from 'react';
import { X, Sliders, Palette, Trash2, HardDrive, Smartphone, Check, Sparkles } from 'lucide-react';
import { UserPreferences } from '../../types';
import { storage } from '../../services/storage';
import { formatBytes } from '../../utils/formatters';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreferencesUpdated: (prefs: UserPreferences) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onPreferencesUpdated,
}) => {
  const [prefs, setPrefs] = useState<UserPreferences>(() => storage.getSettings());
  const [storageBytes, setStorageBytes] = useState(() => storage.getStorageUsageBytes());
  const [clearedToast, setClearedToast] = useState(false);

  if (!isOpen) return null;

  const updateSetting = <K extends keyof UserPreferences>(key: K, val: UserPreferences[K]) => {
    const updated = storage.saveSettings({ [key]: val });
    setPrefs(updated);
    onPreferencesUpdated(updated);
  };

  const handleClearCache = () => {
    if (window.confirm('Clear all local watch history and playback progress?')) {
      storage.clearWatchHistory();
      storage.clearSearchHistory();
      localStorage.removeItem('giplayer_playback_progress');
      setStorageBytes(storage.getStorageUsageBytes());
      setClearedToast(true);
      setTimeout(() => setClearedToast(false), 2500);
    }
  };

  const accents: { id: UserPreferences['themeAccent']; label: string; color: string }[] = [
    { id: 'blue', label: 'Electric Blue', color: '#0ea5e9' },
    { id: 'purple', label: 'Cyber Purple', color: '#8b5cf6' },
    { id: 'cyan', label: 'Neon Cyan', color: '#06b6d4' },
    { id: 'emerald', label: 'Emerald Jade', color: '#10b981' },
    { id: 'amber', label: 'Solar Amber', color: '#f59e0b' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-surface-light border border-surface-border rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-1">Player Settings</h3>
        <p className="text-xs text-gray-400 mb-6">
          Customize video gestures, subtitles, appearance, and cache.
        </p>

        <div className="space-y-6">
          {/* Section 1: Touch & Gesture Controls */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary-400 mb-3 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" /> Gestures (MX Player Pro Style)
            </h4>
            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-3 rounded-xl bg-surface border border-white/5 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-white block">Vertical Swipe Gestures</span>
                  <span className="text-[11px] text-gray-400">Left edge for brightness, right edge for volume</span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.gesturesEnabled}
                  onChange={(e) => updateSetting('gesturesEnabled', e.target.checked)}
                  className="accent-primary-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-surface border border-white/5 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-white block">Horizontal Seek Scrubbing</span>
                  <span className="text-[11px] text-gray-400">Swipe across screen to scrub forward or backward</span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.seekGesture}
                  onChange={(e) => updateSetting('seekGesture', e.target.checked)}
                  className="accent-primary-500 w-4 h-4"
                />
              </label>

              <div className="p-3 rounded-xl bg-surface border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">Double Tap Seek Interval</span>
                  <span className="text-[11px] text-gray-400">Double tap left or right to skip</span>
                </div>
                <select
                  value={prefs.doubleTapSeekSeconds}
                  onChange={(e) => updateSetting('doubleTapSeekSeconds', parseInt(e.target.value))}
                  className="bg-surface-lighter text-xs text-white px-2.5 py-1.5 rounded-lg border border-white/10 outline-none"
                >
                  <option value={5}>5 seconds</option>
                  <option value={10}>10 seconds</option>
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Subtitle Customizer */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary-400 mb-3 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" /> Subtitle Styling
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-surface border border-white/5">
                <span className="text-xs font-semibold text-white block mb-1">Text Size</span>
                <select
                  value={prefs.subtitleSize}
                  onChange={(e) => updateSetting('subtitleSize', e.target.value as UserPreferences['subtitleSize'])}
                  className="w-full bg-surface-lighter text-xs text-white px-2 py-1.5 rounded-lg border border-white/10 outline-none"
                >
                  <option value="sm">Small</option>
                  <option value="base">Normal</option>
                  <option value="lg">Large</option>
                  <option value="xl">Extra Large</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-white/5">
                <span className="text-xs font-semibold text-white block mb-1">Background</span>
                <select
                  value={prefs.subtitleBg}
                  onChange={(e) => updateSetting('subtitleBg', e.target.value as UserPreferences['subtitleBg'])}
                  className="w-full bg-surface-lighter text-xs text-white px-2 py-1.5 rounded-lg border border-white/10 outline-none"
                >
                  <option value="transparent">Transparent</option>
                  <option value="semi-dark">Semi-transparent</option>
                  <option value="solid-black">Solid Black</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Accent Color */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary-400 mb-3 flex items-center gap-1.5">
              <Palette className="w-4 h-4" /> Accent Theme
            </h4>
            <div className="flex items-center gap-3">
              {accents.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => updateSetting('themeAccent', acc.id)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition transform active:scale-95 ${
                    prefs.themeAccent === acc.id ? 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: acc.color }}
                  title={acc.label}
                >
                  {prefs.themeAccent === acc.id && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Cache & Storage */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary-400 mb-3 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4" /> Storage & Cache
            </h4>
            <div className="p-4 rounded-xl bg-surface border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">Local Storage Data</span>
                <span className="text-[11px] text-gray-400 font-mono">
                  {formatBytes(storageBytes)} utilized
                </span>
              </div>
              <button
                onClick={handleClearCache}
                className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear History
              </button>
            </div>
            {clearedToast && (
              <p className="text-xs text-emerald-400 mt-2 font-medium flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Local history and progress reset successfully.
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-8 w-full py-3 bg-white/10 hover:bg-white/15 text-white font-bold rounded-2xl transition text-sm"
        >
          Close Settings
        </button>
      </div>
    </div>
  );
};
