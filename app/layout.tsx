import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans, Nunito } from "next/font/google";
import "./globals.css";
import { AppHeaderProvider } from "@/components/layout/AppHeader";
import AppHeader from "@/components/layout/AppHeader";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HomeschoolReady",
  description: "AI-powered homeschool management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} ${nunito.variable} antialiased`}>
        <AppHeaderProvider>
          <AppHeader />
          <main style={{ minHeight: "calc(100vh - 56px)" }}>
            {children}
          </main>
        </AppHeaderProvider>
      </body>
    </html>
  );
}