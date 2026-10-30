import React from 'react';
import { X, Download, Smartphone, Monitor, Share2, CheckCircle2 } from 'lucide-react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  canInstallDirectly: boolean;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  onInstall,
  canInstallDirectly,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-surface-light border border-surface-border rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-500 to-accent-purple flex items-center justify-center shadow-glow-primary">
            <Download className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Install GIPlayer</h3>
            <p className="text-xs text-primary-400 font-medium">
              Progressive Web App • Instant Launch • Offline Ready
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-6">
          Install GIPlayer on your mobile or desktop device to enjoy a full-screen, native application experience with gesture controls, offline caching, and instant launch.
        </p>

        {canInstallDirectly ? (
          <button
            onClick={() => {
              onInstall();
              onClose();
            }}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-primary-500 to-accent-purple hover:from-primary-400 hover:to-accent-violet text-white font-bold rounded-2xl shadow-glow-primary flex items-center justify-center gap-2 transition active:scale-95 text-sm mb-6"
          >
            <Download className="w-5 h-5" />
            <span>Install Now (One-Click)</span>
          </button>
        ) : (
          <div className="space-y-4 mb-6">
            {/* iOS Instructions */}
            <div className="p-4 rounded-2xl bg-surface border border-white/5 flex items-start gap-3 text-xs">
              <Smartphone className="w-5 h-5 text-accent-cyan flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-semibold mb-1">On iPhone / iPad (iOS Safari):</strong>
                <ol className="list-decimal list-inside space-y-1 text-gray-400">
                  <li>Tap the <Share2 className="w-3.5 h-3.5 inline mx-1 text-primary-400" /> Share button in Safari bottom bar</li>
                  <li>Scroll down and tap <span className="text-white font-semibold">"Add to Home Screen"</span></li>
                  <li>Tap <span className="text-white font-semibold">"Add"</span> in the top-right corner</li>
                </ol>
              </div>
            </div>

            {/* Android & Desktop Instructions */}
            <div className="p-4 rounded-2xl bg-surface border border-white/5 flex items-start gap-3 text-xs">
              <Monitor className="w-5 h-5 text-accent-purple flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-semibold mb-1">On Android / Chrome / Edge:</strong>
                <ol className="list-decimal list-inside space-y-1 text-gray-400">
                  <li>Click the Install icon in your browser address bar</li>
                  <li>Or open browser menu (⋮) and tap <span className="text-white font-semibold">"Install app"</span></li>
                </ol>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-400 pt-4 border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero App Store downloads</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hardware Accelerated</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Works in Airplane Mode</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Automatic Silent Updates</span>
          </div>
        </div>
      </div>
    </div>
  );
};
