import React from 'react';
import { X, Shield, Lock, EyeOff, CheckCircle } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-surface-light border border-surface-border rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Privacy & Security</h3>
            <span className="text-xs text-emerald-400 font-medium">100% Client-Side • Zero Tracking</span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-6">
          GIPlayer is built with a privacy-first ethos. We do not track your watching habits, collect personally identifiable information, or transmit your playback history to third parties.
        </p>

        <div className="space-y-3.5 mb-6 text-xs">
          <div className="p-3.5 rounded-2xl bg-surface border border-white/5 flex items-start gap-3">
            <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-semibold mb-0.5">Local State Storage</strong>
              <p className="text-gray-400">
                All playback positions, watch history, settings, and favorites reside exclusively in your browser's private local storage and IndexedDB.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface border border-white/5 flex items-start gap-3">
            <EyeOff className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-semibold mb-0.5">No External Trackers</strong>
              <p className="text-gray-400">
                Zero third-party analytics scripts, fingerprinting, advertising beacons, or telemetry cookies are included in GIPlayer.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface border border-white/5 flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-semibold mb-0.5">Local Media Protection</strong>
              <p className="text-gray-400">
                When you load a local video file from your computer or phone, it is read entirely through in-memory browser Blob URLs without traversing the network.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold rounded-2xl border border-emerald-500/30 transition text-sm"
        >
          I Understand
        </button>
      </div>
    </div>
  );
};
