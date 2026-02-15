import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container py-8 lg:py-12 max-w-4xl">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
