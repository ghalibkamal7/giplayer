
import { useState } from 'react';
import AdvancedPlayer from './components/player/AdvancedPlayer';
import { VideoLibrary } from './components/library/VideoLibrary';
import type { VideoFile } from './components/library/VideoLibrary';
import type { PlayerVideo } from './components/player/MoreOptionsMenu';

export default function App() {
  const [selectedVideo, setSelectedVideo] = useState<PlayerVideo | null>(null);
  const [queue, setQueue] = useState<PlayerVideo[]>([]);
  const [library, setLibrary] = useState<PlayerVideo[]>([]);

  const toPlayerVideo = (item: VideoFile): PlayerVideo => ({
    id: item.id,
    url: item.url,
    name: item.name,
    file: item.file,
    fileSize: item.file.size,
    mimeType: item.file.type,
  });

  const handleSelect = (video: VideoFile, videos: VideoFile[], allVideos: VideoFile[]) => {
    const playerQueue = videos.map(toPlayerVideo);
    setLibrary(allVideos.map(toPlayerVideo));
    setQueue(playerQueue);
    setSelectedVideo(playerQueue.find((item) => item.id === video.id) ?? toPlayerVideo(video));
  };

  const handleBack = () => {
    setSelectedVideo(null);
    setQueue([]);
  };

  const handleOpenStream = (url: string) => {
    const stream: PlayerVideo = {
      id: url,
      url,
      name: new URL(url).pathname.split('/').pop() || 'Network Stream',
    };
    setQueue([stream]);
    setLibrary((items) => [...items.filter((item) => item.id !== stream.id), stream]);
    setSelectedVideo(stream);
  };

  return (
    <>
      <div className={selectedVideo ? 'hidden' : ''}>
        <VideoLibrary onSelect={handleSelect} onOpenStream={handleOpenStream} />
      </div>
      {selectedVideo && (
        <AdvancedPlayer
          key={selectedVideo.id}
          video={selectedVideo}
          queue={queue}
          library={library}
          onBack={handleBack}
          onChangeVideo={(video, nextQueue) => {
            setSelectedVideo(video);
            if (nextQueue) setQueue(nextQueue);
          }}
        />
      )}
    </>
  );
}
