import React from 'react';
import { Play, Shield, Info, Github, Sparkles } from 'lucide-react';

interface FooterProps {
  onSelectTab: (tab: string) => void;
  onOpenAbout: () => void;
  onOpenPrivacy: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTab, onOpenAbout, onOpenPrivacy }) => {
  return (
    <footer className="w-full bg-surface-light border-t border-surface-border text-gray-400 py-10 px-4 sm:px-6 lg:px-8 mt-16 mb-16 md:mb-0">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center shadow-glow-primary">
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              GI<span className="text-primary-400">Player</span>
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-primary-500/10 text-primary-400 border border-primary-500/20">
              v1.0 PWA
            </span>
          </div>
          <p className="text-xs text-gray-500 max-w-sm text-center md:text-left">
            Production-grade progressive media player engineered for ultra-fast streaming, gesture controls, and offline capability.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium">
          <button onClick={() => onSelectTab('movies')} className="hover:text-white transition">
            Movies
          </button>
          <button onClick={() => onSelectTab('series')} className="hover:text-white transition">
            Web Series
          </button>
          <button onClick={() => onSelectTab('livetv')} className="hover:text-white transition">
            Live TV
          </button>
          <button onClick={() => onSelectTab('library')} className="hover:text-white transition">
            My Library
          </button>
          <button onClick={onOpenAbout} className="hover:text-white transition flex items-center gap-1">
            <Info className="w-3.5 h-3.5" /> About
          </button>
          <button onClick={onOpenPrivacy} className="hover:text-white transition flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" /> Privacy
          </button>
          <a
            href="https://github.com/ghalibkamal7/giplayer"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition flex items-center gap-1 text-primary-400"
          >
            <Github className="w-3.5 h-3.5" /> GitHub
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 gap-2">
        <p>© {new Date().getFullYear()} GIPlayer. All media rights belong to respective Creative Commons creators.</p>
        <p className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-accent-purple" /> Powered by Open Web Standards & PWA
        </p>
      </div>
    </footer>
  );
};
