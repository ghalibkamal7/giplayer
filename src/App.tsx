
import { useState } from 'react';
import AdvancedPlayer from './components/player/AdvancedPlayer';
import { VideoLibrary } from './components/library/VideoLibrary';
import type { VideoFile } from './components/library/VideoLibrary';

export default function App() {
  const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null);

  const handleSelect = (video: VideoFile) => {
    setSelectedVideo(video);
  };

  const handleBack = () => {
    setSelectedVideo(null);
  };

  return selectedVideo ? (
    <div className="relative">
      <button onClick={handleBack} className="absolute top-2 left-2 p-2 bg-gray-800 rounded hover:bg-gray-700">
        Back
      </button>
      <AdvancedPlayer video={selectedVideo} />
    </div>
  ) : (
    <VideoLibrary onSelect={handleSelect} />
  );
}
