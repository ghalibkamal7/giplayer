import React from 'react';
import {
  Play,
  Film,
  Tv,
  Radio,
  FolderHeart,
  Search,
  Download,
  Settings,
  PlusCircle,
  Video,
  Music,
  Folder,
  PlayCircle,
  Info,
  Mail,
  Shield,
  FileText,
  HelpCircle,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenSearch: () => void;
  onOpenQuickPlay: () => void;
  canInstallPwa: boolean;
  onInstallPwa: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSearch,
  onOpenQuickPlay,
  canInstallPwa,
  onInstallPwa,
  onOpenSettings,
}) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Play },
    { id: 'videos', label: 'Videos', icon: Video },
    { id: 'music', label: 'Music', icon: Music },
    { id: 'folders', label: 'Folders', icon: Folder },
    { id: 'streams', label: 'Streams', icon: PlayCircle },
    { id: 'about', label: 'About', icon: Info },
    { id: 'contact', label: 'Contact', icon: Mail },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'terms', label: 'Terms', icon: FileText },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl border-b border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-2.5 group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 via-primary-500 to-accent-purple flex items-center justify-center shadow-glow-primary group-hover:scale-105 transition-transform">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight text-white">
                  GI<span className="text-primary-400">Player</span>
                </span>
                <span className="px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider bg-accent-purple/20 text-accent-purple border border-accent-purple/30 rounded">
                  PRO
                </span>
              </div>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary-500/15 text-primary-400 font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary-400' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-lighter text-gray-400 hover:text-white border border-surface-border text-xs sm:text-sm transition shadow-sm"
            title="Search media (Ctrl+K)"
          >
            <Search className="w-4 h-4 text-primary-400" />
            <span className="hidden sm:inline">Search...</span>
          </button>

          {/* Play URL / Local File Quick Launch */}
          <button
            onClick={onOpenQuickPlay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white border border-white/10 text-xs sm:text-sm font-medium transition active:scale-95"
            title="Play Stream URL or Local Video File"
          >
            <PlusCircle className="w-4 h-4 text-accent-cyan" />
            <span className="hidden lg:inline">Open Stream / File</span>
          </button>

          {/* Install PWA Button */}
          {canInstallPwa && (
            <button
              onClick={onInstallPwa}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-primary-600 to-accent-purple hover:from-primary-500 hover:to-accent-violet text-white text-xs sm:text-sm font-bold shadow-glow-primary transition active:scale-95"
              title="Install GIPlayer as an App"
            >
              <Download className="w-4 h-4 animate-bounce" />
              <span>Install App</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-surface hover:bg-surface-lighter text-gray-400 hover:text-white border border-surface-border transition"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
