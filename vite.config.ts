import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'robots.txt', 'icons/*.png'],
      manifest: {
        name: 'GIPlayer — Offline Video & Music Player',
        short_name: 'GIPlayer',
        description: 'High-performance offline local video and music player with MX-style gestures and 200% volume boost.',
        theme_color: '#090a0f',
        background_color: '#090a0f',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        categories: ['utilities', 'multimedia', 'music', 'video'],
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Local Videos',
            url: '/#videos',
            description: 'Open and play local videos'
          },
          {
            name: 'Music & Audio',
            url: '/#music',
            description: 'Play local music tracks and songs'
          },
          {
            name: 'Local Folders',
            url: '/#folders',
            description: 'Browse local media folders'
          },
          {
            name: 'Network Streams',
            url: '/#streams',
            description: 'Play live video or audio streams'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'artwork-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/commondatastorage\.googleapis\.com\/gtv-videos-bucket\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'video-meta-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    target: 'esnext',
    sourcemap: false,
    chunkSizeWarningLimit: 1200
  }
});
