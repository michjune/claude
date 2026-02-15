import { Header } from '@/components/layout/Header';
import { AdminNav } from '@/components/layout/AdminNav';

export const metadata = {
  title: 'Admin',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <AdminNav />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
