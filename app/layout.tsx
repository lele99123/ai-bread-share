import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/language";
import { LanguageToggle } from "@/components/LanguageToggle";
import { AuthProvider } from "@/lib/auth-provider";
import { NavMenu } from "@/components/NavMenu";

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
  keywords: ["bread recipes", "AI baking", "sourdough", "homemade bread", "bread machine recipes"],
  authors: [{ name: "AI Bread Share" }],
  metadataBase: new URL("https://aibreadshare.com"),
  alternates: {
    canonical: "/",
    languages: {
      "en": "https://aibreadshare.com",
      "zh": "https://aibreadshare.com?lang=zh",
    },
  },
  openGraph: {
    title: "AI Bread Share",
    description: "Share AI-generated bread recipes — chat history, outcomes, and honest reviews.",
    url: "https://aibreadshare.com",
    siteName: "AI Bread Share",
    locale: "en_US",
    alternateLocale: "zh_CN",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 630,
        height: 420,
        alt: "AI Bread Share — Community Recipes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Bread Share",
    description: "Share AI-generated bread recipes — chat history, outcomes, and honest reviews.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
          <AuthProvider>
            <nav className="nav">
              <div className="nav-inner">
                <a href="/" className="nav-logo">
                  AI Bread <span>Share</span>
                </a>
                <div className="flex items-center gap-3">
                  <a href="/" className="btn-ghost nav-browse-btn" style={{ fontSize: '0.8125rem' }}><span>Browse</span></a>
                  <a href="/benchmark" className="btn-ghost" style={{ fontSize: '0.8125rem' }}>
                    <span>Model Benchmark</span>
                  </a>
                  <a href="/submit" className="btn-primary nav-share-btn"><span>Share a Recipe</span></a>
                  <LanguageToggle />
                  <NavMenu />
                </div>
              </div>
            </nav>

            <main className="flex-1">
              {children}
            </main>

            <footer className="footer">
              <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <p style={{ fontFamily: "var(--font-playfair), serif", fontSize: "0.9375rem", marginBottom: "4px" }}>AI Bread Share</p>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-faint)" }}>Where AI meets the perfect crumb</p>
                </div>
                <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                  <a href="/" style={{ fontSize: "0.8125rem", color: "var(--text-muted)", textDecoration: "none" }}>Home</a>
                  <a href="/submit" style={{ fontSize: "0.8125rem", color: "var(--text-muted)", textDecoration: "none" }}>Submit</a>
                  <a href="/benchmark" style={{ fontSize: "0.8125rem", color: "var(--text-muted)", textDecoration: "none" }}>Benchmark</a>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8125rem", color: "var(--text-muted)", textDecoration: "none" }}>GitHub</a>
                </div>
              </div>
            </footer>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
