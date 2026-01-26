import '../styles/globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'YCCE Confession Wall',
  description: 'Anonymous confession platform for YCCE students',
  icons: {
    icon: '../../public/favicon_io/',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon_io/favicon.ico" />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
