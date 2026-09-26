import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

const base = process.env.GITHUB_ACTIONS === 'true' ? '/Muelo-pharma/' : '/';

export default defineConfig(() => {
  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: base,
          name: 'Muelo PHARM — Gestion de Pharmacie',
          short_name: 'MueloPHARM',
          description: 'Solution numérique de vente au détail et de gestion des stocks des produits pharmaceutiques en RDC',
          theme_color: '#1e40af',
          background_color: '#f8fafc',
          display: 'standalone',
          start_url: base,
          scope: base,
          icons: [
            {
              src: `${base}icon.svg`,
              sizes: '192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'any',
            },
            {
              src: `${base}icon.svg`,
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
