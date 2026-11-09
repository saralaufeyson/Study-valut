import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readSupabaseConfig } from './src/lib/supabase-config'

export default defineConfig(({ mode }) => {
  // Stop before serving or bundling if a privileged key is put in public config.
  readSupabaseConfig(loadEnv(mode, process.cwd(), 'VITE_SUPABASE_'))
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['studyvault.svg', 'apple-touch-icon.png'],
        workbox: {
          navigateFallback: '/index.html',
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          cleanupOutdatedCaches: true,
        },
        manifest: {
          name: 'StudyVault',
          short_name: 'StudyVault',
          description: 'A calm, focused home for your learning.',
          theme_color: '#397258',
          background_color: '#f8f9f6',
          id: '/',
          scope: '/',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
  }
})
