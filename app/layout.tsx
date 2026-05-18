import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/language";
import { AuthProvider } from "@/lib/auth-provider";
import { SiteChrome } from "@/components/SiteChrome";

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
            <SiteChrome>{children}</SiteChrome>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
