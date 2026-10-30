import React from 'react';
import { X, Play, Code, ShieldCheck, Heart, ExternalLink } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-500 to-accent-purple flex items-center justify-center shadow-glow-primary">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">About GIPlayer</h3>
            <span className="text-xs text-primary-400 font-medium">Version 1.0.0 Production PWA</span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-6">
          GIPlayer is a next-generation Progressive Web Application inspired by the fluid user experience of MX Player Pro. It brings desktop and mobile users an advanced HTML5 video engine with full gesture controls (brightness, volume, seeking), HLS streaming, Web Audio volume boosting (200%), and complete local file playback.
        </p>

        <div className="space-y-4 mb-6 text-xs text-gray-300">
          <div className="p-3.5 rounded-2xl bg-surface border border-white/5">
            <h4 className="font-bold text-white flex items-center gap-1.5 mb-1 text-primary-400">
              <Code className="w-4 h-4" /> Technical Architecture
            </h4>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>React 18 with TypeScript & Vite</li>
              <li>Tailwind CSS Dark Theme System</li>
              <li>Hls.js Video Engine with adaptive fallback</li>
              <li>Web Audio API Volume Gain (Boost up to 200%)</li>
              <li>IndexedDB / LocalStorage state persistence</li>
              <li>Full PWA Service Worker with Workbox caching</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface border border-white/5">
            <h4 className="font-bold text-white flex items-center gap-1.5 mb-1 text-emerald-400">
              <ShieldCheck className="w-4 h-4" /> Media & Licensing
            </h4>
            <p className="text-gray-400 leading-relaxed">
              GIPlayer strictly adheres to open licensing and creative commons standards. Sample videos are courtesy of the Blender Foundation Open Movies project (CC-BY 3.0/4.0), and Live TV feeds are verified public open broadcasts (NASA TV Public Domain).
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-gray-400">
          <a
            href="https://github.com/ghalibkamal7/giplayer"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary-400 hover:underline font-semibold"
          >
            <span>GitHub Repository</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <span className="flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for video enthusiasts
          </span>
        </div>
      </div>
    </div>
  );
};
