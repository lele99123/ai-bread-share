import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/language";
import { LanguageToggle } from "@/components/LanguageToggle";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "AI Bread Share",
  description: "Share AI-generated bread recipes — chat history, outcomes, and honest reviews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="min-h-screen flex flex-col" style={{ fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif" }}>
        <LanguageProvider>
          <nav className="nav">
            <div className="nav-inner">
              <a href="/" className="nav-logo">
                AI Bread <span>Share</span>
              </a>
              <div className="flex items-center gap-3">
                <a href="/" className="btn-ghost" style={{ fontSize: '0.8125rem' }}>Browse</a>
                <a href="/submit" className="btn-primary">Share a Recipe</a>
                <LanguageToggle />
              </div>
            </div>
          </nav>

          <main className="flex-1">
            {children}
          </main>

          <footer className="footer">
            <div className="container">
              <p>AI Bread Share &mdash; Where AI meets the perfect crumb</p>
            </div>
          </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}