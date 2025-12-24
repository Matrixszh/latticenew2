import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import PageTransition from "@/components/PageTransition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lattice AI CRM",
  description: "Advanced CRM & Automation Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-background">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full flex`}
      >
        <Sidebar />
        <main className="flex-1 md:ml-64 min-h-screen flex flex-col bg-muted/30">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm shadow-sm md:hidden">
            <div className="font-bold text-lg">Lattice AI</div>
            {/* Mobile menu trigger would go here */}
          </header>
          
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="mx-auto max-w-6xl">
              <PageTransition>
                {children}
              </PageTransition>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
