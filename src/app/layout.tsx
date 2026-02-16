import type { Metadata } from 'next';
import { Inter, Newsreader, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/providers/AuthProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { OrganizationJsonLd } from '@/components/seo/JsonLd';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
  style: ['normal', 'italic'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stemcellpulse.com';

export const metadata: Metadata = {
  title: {
    default: 'StemCell Pulse - AI-Powered Stem Cell Research',
    template: '%s | StemCell Pulse',
  },
  description:
    'Stay updated with the latest stem cell research from high-impact journals. AI-powered summaries, blog posts, and social media content.',
  metadataBase: new URL(BASE_URL),
  alternates: {
    types: {
      'application/rss+xml': '/feed.xml',
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
  other: {
    'theme-color': '#1a9a8a',
    'color-scheme': 'light dark',
    'geo.region': 'US',
    'geo.placename': 'United States',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${newsreader.variable} ${jetbrainsMono.variable} font-sans`}>
        <OrganizationJsonLd />
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
