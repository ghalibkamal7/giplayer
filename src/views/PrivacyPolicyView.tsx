import React from 'react';
import { Shield, Lock, EyeOff, Cookie, CheckCircle2 } from 'lucide-react';

export const PrivacyPolicyView: React.FC = () => {
  return (
    <article className="max-w-4xl mx-auto space-y-8 pb-16 animate-fade-in text-gray-300">
      <header className="text-center space-y-3 pb-6 border-b border-surface-border">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <Shield className="w-3.5 h-3.5" /> Privacy & Trust
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs sm:text-sm text-gray-400">
          Last Updated: October 30, 2026 • Effective Immediately
        </p>
      </header>

      <section className="space-y-4 p-6 sm:p-8 rounded-3xl bg-surface border border-surface-border">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 text-emerald-400">
          <Lock className="w-5 h-5" /> 1. Commitment to Client-Side Privacy
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed">
          At <strong>GIPlayer</strong> (accessible from <a href="https://giplayer.vercel.app/" className="text-primary-400 hover:underline">https://giplayer.vercel.app/</a>), we believe that your media files and personal viewing habits belong strictly to you. GIPlayer is architected as an <strong>offline-first, zero-upload media player</strong>.
        </p>
        <p className="text-xs sm:text-sm leading-relaxed">
          When you select video files, audio tracks, or entire folders from your computer, external drive, or smartphone, they are accessed solely through the browser's local sandbox memory using <code>URL.createObjectURL()</code>. <strong>Your media content is NEVER uploaded, sent, streamed, or stored on any remote web server or third-party cloud.</strong>
        </p>
      </section>

      <section className="space-y-4 p-6 sm:p-8 rounded-3xl bg-surface border border-surface-border">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 text-primary-400">
          <EyeOff className="w-5 h-5" /> 2. Data Stored on Your Device
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed">
          To provide features such as resuming videos from where you left off, volume retention, and dark mode customization, GIPlayer stores minimal configuration data directly on your device using <code>localStorage</code>:
        </p>
        <ul className="list-disc list-inside space-y-1.5 text-xs text-gray-400 pl-2">
          <li><strong>Playback Progress:</strong> Timestamps (in seconds) of recently played media to provide the "Resume" prompt.</li>
          <li><strong>User Preferences:</strong> Audio boost multiplier, volume level, double-tap seek interval (5s/10s/15s), and theme accent.</li>
          <li><strong>Watch History:</strong> Titles and timestamps of locally opened files (retained only in your browser storage until cleared).</li>
          <li><strong>Custom Stream URLs:</strong> Any user-provided HLS or video links you choose to save for future sessions.</li>
        </ul>
        <p className="text-xs text-gray-400 mt-2">
          You can delete this data at any time with one click via <strong>Settings &gt; Clear All History &amp; Cache</strong>.
        </p>
      </section>

      <section className="space-y-4 p-6 sm:p-8 rounded-3xl bg-surface border border-surface-border">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 text-amber-400">
          <Cookie className="w-5 h-5" /> 3. Advertising & Cookies (Google AdSense)
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed">
          We may partner with third-party advertising vendors, such as Google AdSense, to display advertisements when you visit our website.
        </p>
        <div className="space-y-2 text-xs text-gray-400">
          <p>
            • Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites.
          </p>
          <p>
            • Google's use of advertising cookies enables it and its partners to serve ads to users based on their visit to our site and/or other sites on the Internet.
          </p>
          <p>
            • Users may opt out of personalized advertising by visiting <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">Google Ads Settings</a> or by visiting <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">www.aboutads.info</a>.
          </p>
        </div>
      </section>

      <section className="space-y-3 p-6 rounded-3xl bg-surface border border-surface-border">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> 4. GDPR and CCPA Compliance
        </h2>
        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
          Under the General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA), you have the right to request information regarding your personal data. Because GIPlayer collects no personal identifiers, IP logs, or server-side accounts, you retain complete sovereignty over your local data directly within your browser settings.
        </p>
      </section>

      <section className="p-6 rounded-3xl bg-surface border border-surface-border space-y-2">
        <h2 className="text-base font-bold text-white">5. Contact Regarding Privacy</h2>
        <p className="text-xs text-gray-400">
          If you have any questions about this Privacy Policy or wish to report a concern, please email us directly at:
          <span className="block mt-1 font-mono text-primary-400 font-semibold">ghalibkamal7@gmail.com</span>
        </p>
      </section>
    </article>
  );
};
