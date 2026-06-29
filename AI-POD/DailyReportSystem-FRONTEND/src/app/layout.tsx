import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { NextIntlClientProvider } from 'next-intl';
import Providers from './providers';
import { UserProvider } from './_contexts/AuthContext';
import { ToastProvider } from './_providers/ToastProvider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AI-POD',
  description: 'Your app description',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ToastProvider>
          <UserProvider>
            <Providers>
              <NextIntlClientProvider>{children}</NextIntlClientProvider>
            </Providers>
          </UserProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
