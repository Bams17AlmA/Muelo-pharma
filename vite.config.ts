import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

const base = process.env.GITHUB_ACTIONS === 'true' ? '/Muelo-pharma/' : '/';

export default defineConfig(() => ({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'logo.svg', 'logo-dark.svg'],
      manifest: {
        id: base,
        name: 'Muelo PHARM — Gestion de Pharmacie',
        short_name: 'Muelo PHARM',
        description: 'Application de gestion de pharmacie : ventes, stocks par lots, péremptions et suivi des opérations en RDC.',
        lang: 'fr-CD',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        theme_color: '#0b1930',
        background_color: '#f4fbff',
        categories: ['business', 'productivity', 'medical'],
        icons: [
          {
            src: `${base}icon.svg`,
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
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
}));
