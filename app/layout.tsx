import type {Metadata} from 'next';
import { Manrope } from 'next/font/google';
import './globals.css'; // Global styles
import { ClientShell } from '@/components/ClientShell';

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'HearthAway - Master Accommodation CRM Platform',
  description: 'Unified master accommodation marketplace CRM with role-isolated workspaces for Students, B2B Partners, and Internal Sales & Management operations.',
  icons: {
    icon: '/brand/hearthaway-icon-dark.svg',
    apple: '/brand/hearthaway-icon-dark.svg',
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
    <html lang="en" className={manrope.variable}>
      <body className={`${manrope.className} bg-[#F7F6F3] text-[#1A1A1A] antialiased`} suppressHydrationWarning>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
