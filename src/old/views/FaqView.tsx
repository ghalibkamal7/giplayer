import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

export const FaqView: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      q: 'Are my video and music files uploaded to any server?',
      a: 'No, absolutely not. All files opened in GIPlayer are processed strictly on your device using HTML5 File API and in-memory Blob URLs. None of your media or personal data ever leaves your computer or phone.'
    },
    {
      q: 'How does the MX Player-style touch gesture engine work?',
      a: 'When watching a video on mobile or desktop, swipe vertically on the left 50% of the screen to adjust brightness (from 20% to 150%). Swipe vertically on the right 50% to adjust volume. Swipe horizontally to seek forward or backward, and double-tap either side to skip 10 seconds.'
    },
    {
      q: 'How does the 200% Audio Volume Booster work?',
      a: 'GIPlayer connects an HTML5 Web Audio API GainNode directly to the video element audio output. This allows safe amplification up to 2.0x (200%) volume for quiet movie dialogues, podcasts, and recordings.'
    },
    {
      q: 'How can I import an entire folder of movies or music songs?',
      a: 'In the Videos, Music, or Folders tab, click "Open Folder" or "Import Directory". Select any folder from your computer or Android storage, and GIPlayer will automatically scan, categorize, and organize all compatible video and audio files into neat directory groups.'
    },
    {
      q: 'Can I install GIPlayer on iPhone, Android, or Windows PC?',
      a: 'Yes! GIPlayer is a Progressive Web App (PWA). On Chrome or Edge, click the Install icon in the address bar. On Android, tap the "Install App" button in the navigation bar. On iPhone / iPad (Safari), tap the Share button and select "Add to Home Screen".'
    },
    {
      q: 'Does GIPlayer work offline in Airplane mode?',
      a: 'Yes. Thanks to modern Service Worker caching, the entire player application shell, icons, and styling are saved locally on your device. You can launch and use GIPlayer without an active Internet connection to play local files.'
    },
    {
      q: 'How do I add external subtitles (.vtt or .srt)?',
      a: 'While playing a video, tap the Subtitles icon in the top right menu bar. Click "Load File" to choose any WebVTT (.vtt) or SubRip (.srt) subtitle file from your device. You can also adjust time sync offsets by +/- 0.5s.'
    }
  ];

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <article className="max-w-3xl mx-auto space-y-8 pb-16 animate-fade-in text-gray-300">
      <header className="text-center space-y-3 pb-6 border-b border-surface-border">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-purple/10 border border-accent-purple/20 text-accent-purple text-xs font-bold uppercase tracking-wider">
          <HelpCircle className="w-3.5 h-3.5" /> Help Center &amp; Guides
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-xs sm:text-sm text-gray-400">
          Everything you need to know about using GIPlayer on desktop, Android, and iOS.
        </p>
      </header>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl bg-surface border border-surface-border overflow-hidden transition-colors"
            >
              <button
                onClick={() => toggle(idx)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-white hover:text-primary-400 transition"
              >
                <span>{faq.q}</span>
                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-primary-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                )}
              </button>
              {isOpen && (
                <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
};
