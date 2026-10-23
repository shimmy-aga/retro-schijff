import type { Metadata } from "next";
import { Geist, Geist_Mono, Bungee, Space_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import LoadingOverlay from "@/components/LoadingOverlay";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const bungee = Bungee({ variable: "--font-press", subsets: ["latin"], weight: "400" });
const space = Space_Mono({ variable: "--font-vt", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "Baby komt eraan! 👶",
  description: "Countdown, gokken, wensen en meer voor de komst van baby Schijff — 28 januari 2027.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${bungee.variable} ${space.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <LoadingOverlay />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}