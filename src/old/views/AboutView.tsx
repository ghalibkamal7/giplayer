import React from 'react';
import {
  ShieldCheck,
  Zap,
  HardDrive,
  Sliders,
  Cpu,
  Layers,
  CheckCircle2,
} from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <article className="max-w-4xl mx-auto space-y-8 pb-16 animate-fade-in text-gray-300">
      {/* Header */}
      <header className="text-center space-y-3 pb-6 border-b border-surface-border">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-bold uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5" /> Next-Generation Multimedia Utility
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          About GIPlayer
        </h1>
        <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
          An offline-first, client-side Progressive Web Application engineered to deliver the touch gestures and speed of MX Player Pro right inside your web browser.
        </p>
      </header>

      {/* Mission Statement */}
      <section className="p-6 sm:p-8 rounded-3xl bg-surface border border-surface-border space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 text-primary-400">
          <Layers className="w-5 h-5" /> What is GIPlayer?
        </h2>
        <p className="text-sm leading-relaxed">
          <strong>GIPlayer</strong> is a high-performance local media player built to give users desktop-class and mobile-class video and audio playback capabilities directly in the browser. Unlike conventional web players that require file uploads to third-party servers, GIPlayer operates <strong>100% locally on your device</strong> using modern HTML5 File APIs and Web Audio APIs.
        </p>
        <p className="text-sm leading-relaxed">
          Whether you want to play downloaded offline movies, organize music folders, listen to songs with audio equalizers, or stream direct HLS feeds, GIPlayer provides a fluid, touch-friendly, dark-themed experience with zero telemetry, zero accounts, and zero subscriptions.
        </p>
      </section>

      {/* Core Engineering Highlights */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-accent-cyan" /> Core Architectural Innovations
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-surface border border-surface-border space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2 text-primary-400">
              <Sliders className="w-4 h-4" /> MX-Style Gesture Engine
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Precision gesture recognition enabling left-edge brightness adjustment (20% to 150%), right-edge volume adjustment, horizontal seek scrubbing, and double-tap skips.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-surface-border space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2 text-amber-400">
              <Zap className="w-4 h-4" /> Web Audio 200% Gain Booster
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              A custom Web Audio API GainNode pipeline boosts faint dialogues and quiet songs up to 200% beyond native operating system volume limitations.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-surface-border space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2 text-emerald-400">
              <HardDrive className="w-4 h-4" /> Zero-Upload Privacy
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Files are streamed from local disk via in-memory <code>URL.createObjectURL</code>. Your personal videos, recordings, and music never leave your machine.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-surface-border space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2 text-accent-purple">
              <ShieldCheck className="w-4 h-4" /> Full Offline PWA
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Complies with PWA standards and Service Worker caching, allowing instant launch from your home screen even in Airplane mode without Internet access.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Checklist */}
      <section className="p-6 rounded-3xl bg-surface border border-surface-border space-y-3">
        <h2 className="text-lg font-bold text-white">Supported Capabilities & Formats</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Video formats: MP4, MKV, WebM, AVI, MOV, FLV, TS</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Audio formats: MP3, M4A, WAV, FLAC, AAC, OGG, OPUS</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>WebVTT and SRT subtitle loading and offset timing</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>HLS (.m3u8) adaptive streaming integration</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Local directory tree and folder parsing</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Picture-in-Picture (PiP) and Screen Lock mode</span>
          </div>
        </div>
      </section>
    </article>
  );
};
