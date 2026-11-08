import type { MetadataRoute } from 'next';

/** Lets customers add the shop to their home screen like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/ar',
    name: 'البدع لتجارة اللحوم الطازجة | Albada',
    short_name: 'البدع',
    description: 'لحوم طازجة وذبائح يومية، توصل لبابك — Fresh meat and daily livestock, delivered to your door.',
    start_url: '/ar',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    dir: 'rtl',
    lang: 'ar',
    background_color: '#F4ECDF',
    theme_color: '#141110',
    categories: ['food', 'shopping'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
