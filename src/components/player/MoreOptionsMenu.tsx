import { X, Music, Languages, Layout, List, Share2, Info, Bookmark, BookOpen, Settings, Scissors, ToggleLeft, ToggleRight } from 'lucide-react';

/**
 * Placeholder for the 12‑item "More Options" menu.
 * Each button currently just logs its action; real implementations will be added later.
 * At the bottom we now have two persistent toggles: Video Display and Shortcuts.
 */
export default function MoreOptionsMenu({ video, onClose }: { video: { url: string; name: string }; onClose: () => void }) {
  const handle = (name: string) => () => {
    console.log(`More option clicked: ${name}`, video);
    // Future implementation goes here.
  };

  const toggleSetting = (key: string) => () => {
    const current = localStorage.getItem(key);
    const next = current === 'true' ? 'false' : 'true';
    localStorage.setItem(key, next);
    // Force re‑render by triggering a custom event (listener in AdvancedPlayer will react).
    window.dispatchEvent(new Event('giplayer-setting-changed'));
  };

  const videoDisplay = localStorage.getItem('giplayer-video-display') !== 'false';
  const shortcutsEnabled = localStorage.getItem('giplayer-shortcuts') !== 'false';

  const items = [
    { icon: <Music className="w-6 h-6" />, label: 'Audio Track', onClick: handle('Audio Track') },
    { icon: <Languages className="w-6 h-6" />, label: 'Subtitle', onClick: handle('Subtitle') },
    { icon: <Layout className="w-6 h-6" />, label: 'Aspect Ratio', onClick: handle('Aspect Ratio') },
    { icon: <Settings className="w-6 h-6" />, label: 'Display Settings', onClick: handle('Display Settings') },
    { icon: <List className="w-6 h-6" />, label: 'Playlists', onClick: handle('Playlists') },
    { icon: <Share2 className="w-6 h-6" />, label: 'Network Stream', onClick: handle('Network Stream') },
    { icon: <Info className="w-6 h-6" />, label: 'Information', onClick: handle('Information') },
    { icon: <Share2 className="w-6 h-6" />, label: 'Share', onClick: handle('Share') },
    { icon: <Scissors className="w-6 h-6" />, label: 'Cut', onClick: handle('Cut') },
    { icon: <Bookmark className="w-6 h-6" />, label: 'Bookmark', onClick: handle('Bookmark') },
    { icon: <BookOpen className="w-6 h-6" />, label: 'Tutorial', onClick: handle('Tutorial') },
    { icon: <Settings className="w-6 h-6" />, label: 'More', onClick: handle('More') },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4">
      <div className="bg-gray-900 text-white rounded-lg w-full max-w-2xl max-h-full overflow-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">More Options</h2>
          <button onClick={onClose} className="p-1 hover:text-blue-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {items.map((it) => (
            <button
              key={it.label}
              onClick={it.onClick}
              className="flex flex-col items-center p-2 hover:bg-gray-800 rounded"
            >
              {it.icon}
              <span className="mt-1 text-sm text-center">{it.label}</span>
            </button>
          ))}
        </div>
        {/* Settings toggles */}
        <div className="border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span>Video Display</span>
            <button onClick={toggleSetting('giplayer-video-display')} className="flex items-center">
              {videoDisplay ? <ToggleLeft className="w-6 h-6 text-blue-400" /> : <ToggleRight className="w-6 h-6 text-gray-400" />}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span>Shortcuts</span>
            <button onClick={toggleSetting('giplayer-shortcuts')} className="flex items-center">
              {shortcutsEnabled ? <ToggleLeft className="w-6 h-6 text-blue-400" /> : <ToggleRight className="w-6 h-6 text-gray-400" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
