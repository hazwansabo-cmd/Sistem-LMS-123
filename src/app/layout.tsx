import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/lms/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LMS Al Amin Edu Oasis | Latihan AI Kakitangan",
  description: "Sistem Pengurusan Pembelajaran Latihan Kecerdasan Buatan (AI) untuk kakitangan Al Amin, Malaysia.",
  keywords: ["LMS", "Al Amin", "Latihan AI", "Malaysia", "Kehadiran QR", "Sijil"],
  authors: [{ name: "Al Amin Edu Oasis" }],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground mesh-bg min-h-screen`}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
