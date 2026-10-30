import React from 'react';
import { FileText, ShieldAlert } from 'lucide-react';

export const TermsView: React.FC = () => {
  return (
    <article className="max-w-4xl mx-auto space-y-8 pb-16 animate-fade-in text-gray-300">
      <header className="text-center space-y-3 pb-6 border-b border-surface-border">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-bold uppercase tracking-wider">
          <FileText className="w-3.5 h-3.5" /> Legal Terms
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Terms of Service
        </h1>
        <p className="text-xs sm:text-sm text-gray-400">
          Last Updated: October 30, 2026
        </p>
      </header>

      <section className="space-y-4 p-6 sm:p-8 rounded-3xl bg-surface border border-surface-border">
        <h2 className="text-lg font-bold text-white">1. Acceptance of Terms</h2>
        <p className="text-xs sm:text-sm leading-relaxed">
          By accessing or using GIPlayer (<a href="https://giplayer.vercel.app/" className="text-primary-400 hover:underline">https://giplayer.vercel.app/</a>), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using this site.
        </p>
      </section>

      <section className="space-y-4 p-6 sm:p-8 rounded-3xl bg-surface border border-surface-border">
        <h2 className="text-lg font-bold text-white">2. User Responsibilities & Content Ownership</h2>
        <p className="text-xs sm:text-sm leading-relaxed">
          GIPlayer is a local media player utility tool. Users are solely responsible for ensuring they possess the lawful right, license, or personal ownership to open and play any video, music, or audio file loaded into the player.
        </p>
        <p className="text-xs sm:text-sm leading-relaxed text-gray-400">
          GIPlayer does not host, distribute, upload, or sell copyrighted media, films, or songs. All media playback occurs strictly within the user's private browser memory sandbox.
        </p>
      </section>

      <section className="space-y-4 p-6 sm:p-8 rounded-3xl bg-surface border border-surface-border">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 text-rose-400">
          <ShieldAlert className="w-5 h-5" /> 3. Disclaimer of Warranties
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed text-gray-400">
          GIPlayer is provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied. While we strive for maximum video codec compatibility and smooth playback performance across all devices, we do not warrant that all arbitrary video formats or unsupported stream codecs will play flawlessly in all browser configurations.
        </p>
      </section>

      <section className="p-6 rounded-3xl bg-surface border border-surface-border space-y-2">
        <h2 className="text-base font-bold text-white">4. Governing Law & Contact</h2>
        <p className="text-xs text-gray-400 leading-relaxed">
          These terms shall be governed and construed in accordance with standard international web software practices. For inquiries regarding these terms, reach us at:
          <span className="block mt-1 font-mono text-primary-400 font-semibold">ghalibkamal7@gmail.com</span>
        </p>
      </section>
    </article>
  );
};
