import type { Metadata } from "next";
import { PT_Serif } from "next/font/google";
import "./globals.css";

const ptSerif = PT_Serif({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-pt-serif",
});

export const metadata: Metadata = {
  title: "Buddy Alpha Preview",
  description: "AI-powered assistant for Penn State students. Ask about courses, majors, policies and more.",
  openGraph: {
    title: "Buddy Alpha Preview",
    description: "AI-powered assistant for Penn State students",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Buddy Alpha Preview",
    description: "AI-powered assistant for Penn State students",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className={`${ptSerif.variable} antialiased`}>{children}</body>
    </html>
  );
}
