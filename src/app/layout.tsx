import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'LeadGen Pro - Lead Discovery Engine',
  description: 'Generate and manage business leads based on industry and location',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-64">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
