import React from 'react';
import { X, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space / K', desc: 'Play / Pause toggle' },
    { key: 'F', desc: 'Toggle Fullscreen' },
    { key: 'M', desc: 'Mute / Unmute audio' },
    { key: '← / →', desc: 'Seek backward / forward 5 seconds' },
    { key: 'J / L', desc: 'Seek backward / forward 10 seconds' },
    { key: '↑ / ↓', desc: 'Increase / Decrease volume by 5%' },
    { key: 'C', desc: 'Toggle Subtitles on / off' },
    { key: 'P', desc: 'Picture-in-Picture mode' },
    { key: '0 - 9', desc: 'Jump to 0% - 90% of video' },
    { key: 'N', desc: 'Next Episode (when available)' },
    { key: '?', desc: 'Show this shortcuts guide' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-surface-light border border-surface-border rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Command className="w-5 h-5 text-primary-400" />
            <span>Keyboard Shortcuts</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-surface hover:bg-surface-lighter transition text-xs"
            >
              <span className="text-gray-300 font-medium">{s.desc}</span>
              <kbd className="px-2 py-1 bg-white/10 text-primary-300 font-mono font-bold rounded border border-white/10">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 bg-primary-500 hover:bg-primary-400 text-white font-bold rounded-xl transition text-sm shadow-glow-primary"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
