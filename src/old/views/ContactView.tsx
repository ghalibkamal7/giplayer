import React, { useState } from 'react';
import { Mail, MessageSquare, Send, CheckCircle2, Github, HelpCircle } from 'lucide-react';

export const ContactView: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    // Simulate safe client-side submission
    setIsSubmitted(true);
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
  };

  return (
    <article className="max-w-3xl mx-auto space-y-8 pb-16 animate-fade-in text-gray-300">
      <header className="text-center space-y-3 pb-6 border-b border-surface-border">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Contact & Support
        </h1>
        <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto">
          Have a question, feedback, feature request, or technical query about GIPlayer? Get in touch with our team.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-surface border border-surface-border text-center space-y-2">
          <Mail className="w-6 h-6 text-primary-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">Direct Email</h3>
          <p className="text-xs text-gray-400">ghalibkamal7@gmail.com</p>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-surface-border text-center space-y-2">
          <Github className="w-6 h-6 text-accent-purple mx-auto" />
          <h3 className="text-sm font-bold text-white">GitHub Issues</h3>
          <a
            href="https://github.com/ghalibkamal7/giplayer/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary-400 hover:underline block"
          >
            Submit an Issue
          </a>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-surface-border text-center space-y-2">
          <HelpCircle className="w-6 h-6 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">Response Time</h3>
          <p className="text-xs text-gray-400">Typically within 24-48 hours</p>
        </div>
      </div>

      {/* Contact Form */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-surface-border shadow-xl">
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary-400" /> Send Us a Message
        </h2>
        <p className="text-xs text-gray-400 mb-6">
          Fill out the form below and we will get back to you as soon as possible.
        </p>

        {isSubmitted ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Message Received!</h3>
            <p className="text-xs text-gray-300">
              Thank you for contacting GIPlayer. We have received your submission and will review it promptly.
            </p>
            <button
              onClick={() => setIsSubmitted(false)}
              className="mt-3 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold"
            >
              Send Another Note
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-lighter border border-surface-border focus:border-primary-500 rounded-xl text-white outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-lighter border border-surface-border focus:border-primary-500 rounded-xl text-white outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Subject
              </label>
              <input
                type="text"
                placeholder="Feature feedback, bug report, or general inquiry"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 bg-surface-lighter border border-surface-border focus:border-primary-500 rounded-xl text-white outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Message *
              </label>
              <textarea
                required
                rows={5}
                placeholder="Describe your question or message in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 bg-surface-lighter border border-surface-border focus:border-primary-500 rounded-xl text-white outline-none transition resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-accent-cyan hover:from-primary-400 hover:to-accent-cyan text-white font-bold rounded-xl shadow-glow-primary flex items-center justify-center gap-2 transition active:scale-95 text-xs sm:text-sm"
            >
              <Send className="w-4 h-4" />
              <span>Send Message</span>
            </button>
          </form>
        )}
      </div>
    </article>
  );
};
