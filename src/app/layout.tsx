import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  weight: ["500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Zatch — Shop Live. Name Your Price.",
    template: "%s · Zatch",
  },
  description:
    "Zatch is India's first live bargain marketplace. Watch sellers go live, discover products through short videos, and negotiate your price in real time.",
  metadataBase: new URL("https://zatch.shop"),
  openGraph: { type: "website", siteName: "Zatch" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${interTight.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
