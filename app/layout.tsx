import type { Metadata } from 'next';
import { PT_Serif } from 'next/font/google';
import './globals.css';

const ptSerif = PT_Serif({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-pt-serif',
});

export const metadata: Metadata = {
  title: 'Local Threads Chatbot',
  description: 'A lightweight ChatGPT/Claude-style chat UI with local storage',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${ptSerif.variable} font-serif antialiased`}>
        {children}
      </body>
    </html>
  );
}