import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Y Search - SIR 2002 Electoral Roll Portal",
  description: "Live electoral roll search for Andhra Pradesh Graduate MLC constituencies (2002 SIR). Built with care by Yasir.",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon_ico/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon_ico/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/favicon_ico/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
