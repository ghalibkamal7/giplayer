import React from 'react';
import { Play, Video, Music, Folder, PlayCircle, Info, Mail, Shield, FileText, HelpCircle, FolderHeart } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
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
    { id: 'library', label: 'Library', icon: FolderHeart },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-xl border-t border-surface-border safe-bottom">
      <div className="grid grid-cols-5 h-16 items-center px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className="flex flex-col items-center justify-center gap-1 w-full py-1 text-center transition-colors"
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? 'bg-primary-500/20 text-primary-400 scale-110' : 'text-gray-400'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight ${
                  isActive ? 'text-primary-400 font-bold' : 'text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
