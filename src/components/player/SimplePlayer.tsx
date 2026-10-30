import React, { useState, useRef } from 'react';
import { X, FolderOpen, Play, VolumeX, ArrowUpDown } from 'lucide-react';

export const SimplePlayer: React.FC = () => {
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isAudio, setIsAudio] = useState(false);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    const ext = file.name.split('.').pop()?.toLowerCase();
    setIsAudio(ext === 'mp3' || ext === 'wav' || ext === 'flac');
  };

  const togglePlay = () => {
    const el = mediaRef.current;
    if (!el) return;
    if (el instanceof HTMLVideoElement || el instanceof HTMLAudioElement) {
      el.paused ? el.play() : el.pause();
    }
  };

  const toggleMute = () => {
    const el = mediaRef.current;
    if (!el) return;
    el.volume = el.volume > 0 ? 0 : 1;
  };

  const requestFullScreen = () => {
    const el = mediaRef.current as HTMLVideoElement;
    if (el?.requestFullscreen) el.requestFullscreen();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-6">
      <h1 className="text-2xl font-bold mb-4">Simple Media Player</h1>
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded">
          <FolderOpen className="w-5 h-5" />
          <span>Select Media File</span>
          <input type="file" accept="video/*,audio/*" className="hidden" onChange={handleFileChange} />
        </label>
      </div>

      {mediaFile && (
        <div className="w-full max-w-3xl">
          {isAudio ? (
            <audio ref={mediaRef as any} src={URL.createObjectURL(mediaFile)} controls className="w-full" />
          ) : (
            <video ref={mediaRef as any} src={URL.createObjectURL(mediaFile)} className="w-full rounded" controls={false} />
          )}

          <div className="flex items-center justify-center gap-4 mt-2 text-gray-300">
            <button onClick={togglePlay} className="p-2 hover:text-white"><Play className="w-6 h-6" /></button>
            <button onClick={toggleMute} className="p-2 hover:text-white"><VolumeX className="w-6 h-6" /></button>
            {!isAudio && (
              <button onClick={requestFullScreen} className="p-2 hover:text-white"><ArrowUpDown className="w-6 h-6" /></button>
            )}
            <button onClick={() => setMediaFile(null)} className="p-2 hover:text-white"><X className="w-6 h-6" /></button>
          </div>
        </div>
      )}
    </div>
  );
};
