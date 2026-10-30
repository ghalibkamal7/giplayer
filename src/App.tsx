import { useState, useEffect, useCallback } from 'react';
import { WifiOff } from 'lucide-react';
import { MediaItem, Episode, UserPreferences } from './types';
import { storage } from './services/storage';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { Footer } from './components/layout/Footer';
import { HomeView } from './views/HomeView';
import { MoviesView } from './views/MoviesView';
import { SeriesView } from './views/SeriesView';
import { LiveTvView } from './views/LiveTvView';
import { VideosView } from './views/VideosView';
import { MusicView } from './views/MusicView';
import { FoldersView } from './views/FoldersView';
import { StreamsView } from './views/StreamsView';
import { AboutView } from './views/AboutView';
import { ContactView } from './views/ContactView';
import { PrivacyPolicyView } from './views/PrivacyPolicyView';
import { TermsView } from './views/TermsView';
import { FaqView } from './views/FaqView';
import { VideosView } from './views/VideosView';
import { MusicView } from './views/MusicView';
import { FoldersView } from './views/FoldersView';
import { StreamsView } from './views/StreamsView';
import { AboutView } from './views/AboutView';
import { ContactView } from './views/ContactView';
import { PrivacyPolicyView } from './views/PrivacyPolicyView';
import { TermsView } from './views/TermsView';
import { FaqView } from './views/FaqView';
import { VideoPlayer } from './components/player/VideoPlayer';
import { PwaInstallModal } from './components/modals/PwaInstallModal';
import { QuickPlayModal } from './components/modals/QuickPlayModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { SearchModal } from './components/modals/SearchModal';
import { AboutModal } from './components/modals/AboutModal';
import { PrivacyModal } from './components/modals/PrivacyModal';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [activeMedia, setActiveMedia] = useState<MediaItem | null>(null);
  const [activeEpisode, setActiveEpisode] = useState<Episode | undefined>(undefined);

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuickPlayOpen, setIsQuickPlayOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  // Offline status
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstallPwa, setCanInstallPwa] = useState(false);

  // User Settings
  const [preferences, setPreferences] = useState<UserPreferences>(() => storage.getSettings());

  // Listen to PWA beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstallPwa(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setCanInstallPwa(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Offline / Online listeners
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // URL Hash router sync
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['home', 'movies', 'series', 'livetv', 'library', 'videos', 'music', 'folders', 'streams', 'about', 'contact', 'privacy', 'terms', 'faq'].includes(hash)) {
        setCurrentTab(hash);
      }
    };

    if (window.location.hash) {
      handleHashChange();
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Handle Tab Switch
  const handleSelectTab = (tab: string) => {
    setCurrentTab(tab);
    window.location.hash = tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keyboard shortcut Ctrl+K or / for Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Play Media
  const handlePlayMedia = useCallback((item: MediaItem, episode?: Episode) => {
    setActiveMedia(item);
    setActiveEpisode(episode);

    // Record in watch history
    storage.addToWatchHistory({
      mediaId: item.id,
      title: item.title,
      type: item.type,
      posterUrl: episode?.thumbnailUrl || item.posterUrl,
      currentTime: 0,
      duration: episode?.duration || item.duration || 0,
      episodeTitle: episode ? `S${episode.seasonNumber}:E${episode.episodeNumber} - ${episode.title}` : undefined,
    });
  }, []);

  // Handle Trigger PWA Install
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        setCanInstallPwa(false);
      }
    } else {
      setIsInstallOpen(true);
    }
  };

  // If Full-Screen Video Player is active
  if (activeMedia) {
    return (
      <VideoPlayer
        media={activeMedia}
        initialEpisode={activeEpisode}
        onBack={() => {
          setActiveMedia(null);
          setActiveEpisode(undefined);
        }}
        onNextEpisode={(nextEp) => {
          setActiveEpisode(nextEp);
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-background text-gray-100 flex flex-col accent-${preferences.themeAccent}`}>
      {/* Offline Status Alert Banner */}
      {isOffline && (
        <div className="bg-amber-500/90 text-black px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 sticky top-0 z-50 backdrop-blur-md">
          <WifiOff className="w-4 h-4" />
          <span>You are currently offline. Cached library and local video files are still available.</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenQuickPlay={() => setIsQuickPlayOpen(true)}
        canInstallPwa={canInstallPwa || true}
        onInstallPwa={handleInstallClick}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {currentTab === 'home' && (
          <HomeView onPlayMedia={handlePlayMedia} onNavigateTab={handleSelectTab} />
        )}
        {currentTab === 'movies' && (
          <MoviesView onPlayMedia={handlePlayMedia} />
        )}
        {currentTab === 'series' && (
          <SeriesView onPlayMedia={handlePlayMedia} />
        )}
        {currentTab === 'livetv' && (
          <LiveTvView onPlayMedia={handlePlayMedia} />
        )}
        {currentTab === 'videos' && (
          <VideosView onPlayMedia={handlePlayMedia} onRefresh={() => {}} />
        )}
        {currentTab === 'music' && (
          <MusicView onPlayMedia={handlePlayMedia} onRefresh={() => {}} />
        )}
        {currentTab === 'folders' && (
          <FoldersView onPlayMedia={handlePlayMedia} onRefresh={() => {}} />
        )}
        {currentTab === 'streams' && (
          <StreamsView onPlayMedia={handlePlayMedia} onRefresh={() => {}} />
        )}
        {currentTab === 'about' && (
          <AboutView />
        )}
        {currentTab === 'contact' && (
          <ContactView />
        )}
        {currentTab === 'privacy' && (
          <PrivacyPolicyView />
        )}
        {currentTab === 'terms' && (
          <TermsView />
        )}
        {currentTab === 'faq' && (
          <FaqView />
        )}

      {/* Footer */}
      </main>
      <Footer
        onSelectTab={handleSelectTab}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
      />

      {/* Mobile Bottom Navigation */}
      <BottomNav currentTab={currentTab} onSelectTab={handleSelectTab} />

      {/* Modals */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectMedia={handlePlayMedia}
      />

      <QuickPlayModal
        isOpen={isQuickPlayOpen}
        onClose={() => setIsQuickPlayOpen(false)}
        onPlayMedia={handlePlayMedia}
      />

      <PwaInstallModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
        onInstall={handleInstallClick}
        canInstallDirectly={Boolean(deferredPrompt)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onPreferencesUpdated={(newPrefs) => setPreferences(newPrefs)}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />
    </div>
  );
}

export default App;
