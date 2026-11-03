import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import Script from "next/script";
import { AuthProvider } from "@/components/auth/auth-provider";
import { RealtimeProvider } from "@/components/realtime/realtime-provider";
import { AppPrompt } from "@/components/site/get-app";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  weight: ["500", "600", "700"],
  display: "swap",
});

// Google Ads tag (gtag.js).
const GOOGLE_TAG_ID = "AW-18516509424";
// Meta (Facebook) Pixel.
const META_PIXEL_ID = "1421438440165577";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Zatch - Shop Live. Name Your Price.",
    template: "%s · Zatch",
  },
  description:
    "Zatch is India's first live bargain marketplace. Watch sellers go live, discover products through short videos, and negotiate your price in real time.",
  metadataBase: new URL("https://zatch.shop"),
  openGraph: { type: "website", siteName: "Zatch" },
  verification: { google: "qUUEfX4LVyBz5OqcvWL_E80sPvOAh4n1a_a3CZAg1jc" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${interTight.variable} ${inter.variable}`}>
      <body suppressHydrationWarning>
        <AuthProvider>
          <RealtimeProvider>{children}</RealtimeProvider>
        </AuthProvider>
        <AppPrompt />
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`} strategy="afterInteractive" />
        <Script id="google-tag" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_TAG_ID}');`}
        </Script>
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`}
        </Script>
        <noscript>
          <img height="1" width="1" style={{ display: "none" }} alt=""
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} />
        </noscript>
      </body>
    </html>
  );
}
