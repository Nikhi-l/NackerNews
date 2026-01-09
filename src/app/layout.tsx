import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'Nacker News',
  description: 'A Hacker News clone built with Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-4">{children}</main>
        <footer className="max-w-5xl mx-auto px-4 py-8 text-center text-hn-text text-xs border-t border-hn-orange/20">
          <p>Nacker News - A Hacker News clone for demonstration purposes</p>
        </footer>
      </body>
    </html>
  );
}
