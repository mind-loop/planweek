import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered from main.tsx so we can check for updates whenever the app is reopened.
      injectRegister: false,
      includeAssets: ['logo.png', 'apple-touch-icon.png', 'church.jpg'],
      manifest: {
        name: 'УВС БАПТИСТ ЧУУЛГАН — Чуулганы Мэдээ',
        short_name: 'Чуулганы Мэдээ',
        description: 'Увс Баптист Чуулганы долоо хоног тутмын мэдээ, хуваарь, эшлэл.',
        lang: 'mn',
        theme_color: '#0e7490',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        id: '/',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // index.html is NOT precached: an installed iPhone app would otherwise keep
        // opening an old copy (missing new logos/banners). Pages go network-first below.
        globPatterns: ['**/*.{js,css,svg,png,jpg,woff2}'],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // The app page: always fresh when online, last copy when offline.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'pages', networkTimeoutSeconds: 4, expiration: { maxEntries: 5 } },
          },
          {
            // Uploaded images/files (banners, plan pictures). Every upload gets a new URL,
            // so cache-first is safe and makes them show offline too.
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/storage/v1/object/public/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-files',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 60 },
            },
          },
          {
            // Serve the latest bulletin when online, the last-seen copy when offline.
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 14 },
            },
          },
        ],
      },
    }),
  ],
});
