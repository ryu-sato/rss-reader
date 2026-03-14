import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Rss, Bookmark } from "lucide-react";
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
  title: "RSS Reader",
  description: "Manage and read your RSS feeds",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
          <div className="container mx-auto px-4 h-14 flex items-center">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors"
            >
              <Rss className="h-5 w-5 text-primary" />
              <span>RSS Reader</span>
            </Link>
            <Link
              href="/read-later"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors ml-6"
            >
              <Bookmark className="h-4 w-4" />
              <span>あとで読む</span>
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-4">{children}</div>
      </body>
    </html>
  );
}
