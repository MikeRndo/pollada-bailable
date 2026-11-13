import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gran Pollada Pro Salud – Caja y Cocina',
    id: '/',
    short_name: 'Pollada',
    description: 'Venta de tickets, escáner QR y control de entregas',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#04070d',
    theme_color: '#04070d',
    lang: 'es-PE',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
