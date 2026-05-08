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
  keywords: ["bread recipes", "AI baking", " sourdough", "homemade bread", "bread machine recipes"],
  authors: [{ name: "AI Bread Share" }],
  alternates: {
    canonical: "https://ai-bread-share.vercel.app",
    languages: {
      "en": "https://ai-bread-share.vercel.app",
      "zh": "https://ai-bread-share.vercel.app?lang=zh",
    },
  },
  openGraph: {
    title: "AI Bread Share",
    description: "Share AI-generated bread recipes — chat history, outcomes, and honest reviews.",
    url: "https://ai-bread-share.vercel.app",
    siteName: "AI Bread Share",
    locale: "en_US",
    alternateLocale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Bread Share",
    description: "Share AI-generated bread recipes — chat history, outcomes, and honest reviews.",
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
            <div className="container">
              <p>AI Bread Share &mdash; Where AI meets the perfect crumb</p>
            </div>
          </footer>
        </AuthProvider>
          </LanguageProvider>
      </body>
    </html>
  );
}