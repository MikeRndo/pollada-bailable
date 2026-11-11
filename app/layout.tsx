import type { Metadata, Viewport } from 'next';
import { Anton, Luckiest_Guy, Outfit, Pacifico } from 'next/font/google';
import './globals.css';
import RegistrarSW from '@/components/RegistrarSW';

const ui = Outfit({ subsets: ['latin'], variable: '--font-ui', display: 'swap' });
const luckiest = Luckiest_Guy({ weight: '400', subsets: ['latin'], variable: '--font-luckiest', display: 'swap' });
const pacifico = Pacifico({ weight: '400', subsets: ['latin'], variable: '--font-pacifico', display: 'swap' });
const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-anton', display: 'swap' });

export const metadata: Metadata = {
  title: 'Pollada Pro Salud · Caja y Cocina',
  description: 'Venta de tickets, escáner QR de cocina y caja de la Gran Pollada Pro Salud.',
  applicationName: 'Pollada Pro Salud',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  appleWebApp: { capable: true, title: 'Pollada', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0e0a26',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${ui.variable} ${luckiest.variable} ${pacifico.variable} ${anton.variable}`}>
      <body className="min-h-dvh font-sans text-white antialiased">
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
