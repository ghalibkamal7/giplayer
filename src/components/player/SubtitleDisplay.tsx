import React, { useEffect, useState } from 'react';
import { UserPreferences } from '../../types';

interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

interface SubtitleDisplayProps {
  subtitleUrl: string | null;
  currentTime: number;
  offset: number; // in seconds
  preferences: Pick<UserPreferences, 'subtitleSize' | 'subtitleColor' | 'subtitleBg'>;
}

export const SubtitleDisplay: React.FC<SubtitleDisplayProps> = ({
  subtitleUrl,
  currentTime,
  offset,
  preferences,
}) => {
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [activeCueText, setActiveCueText] = useState<string | null>(null);

  // Fetch and parse WebVTT/SRT text
  useEffect(() => {
    if (!subtitleUrl) {
      setCues([]);
      setActiveCueText(null);
      return;
    }

    let isCancelled = false;

    const parseTimestamp = (timeStr: string): number => {
      const parts = timeStr.trim().replace(',', '.').split(':');
      if (parts.length === 3) {
        return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
      } else if (parts.length === 2) {
        return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
      }
      return 0;
    };

    fetch(subtitleUrl)
      .then((res) => res.text())
      .then((content) => {
        if (isCancelled) return;
        const parsed: SubtitleCue[] = [];
        // Regex to match timestamp lines: e.g. "00:00:01.000 --> 00:00:04.000"
        const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        let i = 0;
        while (i < lines.length) {
          const line = lines[i].trim();
          if (line.includes('-->')) {
            const [startStr, endStr] = line.split('-->');
            const start = parseTimestamp(startStr);
            const end = parseTimestamp(endStr.split(' ')[0]);
            i++;
            const textLines: string[] = [];
            while (i < lines.length && lines[i].trim() !== '') {
              textLines.push(lines[i].trim());
              i++;
            }
            if (textLines.length > 0) {
              parsed.push({
                start,
                end,
                text: textLines.join('\n'),
              });
            }
          }
          i++;
        }
        setCues(parsed);
      })
      .catch((err) => {
        console.warn('Could not parse subtitle file:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [subtitleUrl]);

  // Update active subtitle cue on currentTime update
  useEffect(() => {
    if (cues.length === 0) {
      setActiveCueText(null);
      return;
    }

    const adjustedTime = currentTime + offset;
    const current = cues.find((c) => adjustedTime >= c.start && adjustedTime <= c.end);
    setActiveCueText(current ? current.text : null);
  }, [currentTime, offset, cues]);

  if (!activeCueText) return null;

  const sizeClasses = {
    sm: 'text-sm md:text-base',
    base: 'text-base md:text-xl',
    lg: 'text-lg md:text-2xl',
    xl: 'text-xl md:text-3xl font-bold',
  }[preferences.subtitleSize || 'base'];

  const bgClasses = {
    transparent: 'bg-transparent text-shadow-subtitle',
    'semi-dark': 'bg-black/70 backdrop-blur-xs px-4 py-1.5 rounded-lg border border-white/10',
    'solid-black': 'bg-black px-4 py-1.5 rounded-lg shadow-2xl',
  }[preferences.subtitleBg || 'semi-dark'];

  return (
    <div className="absolute bottom-20 md:bottom-24 left-0 right-0 z-25 flex justify-center pointer-events-none px-6">
      <div
        className={`${bgClasses} ${sizeClasses} text-center max-w-2xl select-none leading-relaxed transition-all drop-shadow-lg`}
        style={{ color: preferences.subtitleColor || '#ffffff' }}
      >
        {activeCueText}
      </div>
    </div>
  );
};
