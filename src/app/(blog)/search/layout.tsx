import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search Articles',
  description:
    'Search stem cell research articles, regenerative medicine insights, and AI-powered research summaries on StemCell Pulse.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
