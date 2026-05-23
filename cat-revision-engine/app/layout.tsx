import { Inter } from 'next/font/google';
import './globals.css';
import { BottomNav } from '@/components/layout/BottomNav';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'CAT Revision Engine',
  description: 'Your personal revision engine for CAT',
}

import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <BottomNav />
        </Providers>
      </body>
    </html>
  )
}
