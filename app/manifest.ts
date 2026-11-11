import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gran Pollada Pro Salud – Caja y Cocina',
    short_name: 'Pollada',
    description: 'Venta de tickets, escáner QR y control de entregas',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#07051a',
    theme_color: '#0e0a26',
    lang: 'es-PE',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
