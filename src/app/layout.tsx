import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TRPCProvider } from "@/lib/trpc/Provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "carouself | Zero-Knowledge Journal",
  description: "A beautifully private, end-to-end encrypted journaling application.",
  icons: {
    icon: "/images/carouself_icon.png",
  },
};

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "react-hot-toast";
import { EncryptionProvider } from "@/lib/crypto/EncryptionContext";
import { GlobalHeader } from "@/components/GlobalHeader";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head />
      <body className="min-h-full flex flex-col">
        <ErrorBoundary>
          <TRPCProvider>
            <EncryptionProvider>
              <GlobalHeader />
              {children}
            </EncryptionProvider>
          </TRPCProvider>
          <Toaster position="bottom-right" toastOptions={{
            style: { background: '#171717', color: '#e5e5e5', border: '1px solid #262626' }
          }} />
        </ErrorBoundary>
      </body>
    </html>
  );
}
