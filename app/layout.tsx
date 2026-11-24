import type {Metadata} from 'next';
import './fonts/lato.css';
import './globals.css'; // Global styles
import { ClientShell } from '@/components/ClientShell';

export const metadata: Metadata = {
  title: 'HearthAway - Master Accommodation CRM Platform',
  description: 'Unified master accommodation marketplace CRM with role-isolated workspaces for Students, B2B Partners, and Internal Sales & Management operations.',
  icons: {
    icon: { url: '/favicon.png', type: 'image/png', sizes: '48x48' },
    apple: { url: '/apple-touch-icon.png', type: 'image/png', sizes: '180x180' },
  },
  openGraph: {
    title: 'HearthAway - Master Accommodation CRM Platform',
    description: 'Unified master accommodation marketplace CRM with role-isolated workspaces for Students, B2B Partners, and Internal Sales & Management operations.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HearthAway - Master Accommodation CRM Platform',
    description: 'Unified master accommodation marketplace CRM with role-isolated workspaces for Students, B2B Partners, and Internal Sales & Management operations.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/brand/lato/latin-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="bg-[#F7F6F3] text-[#1A1A1A] antialiased" suppressHydrationWarning>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
