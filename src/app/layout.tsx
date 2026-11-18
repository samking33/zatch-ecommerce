import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { AuthProvider } from "@/components/auth/auth-provider";
import { RealtimeProvider } from "@/components/realtime/realtime-provider";
import { AppPrompt } from "@/components/site/get-app";
import "./globals.css";

// Fonts ship with the site (the latin files Google Fonts serves; SIL Open Font License) so the
// build never downloads them: a Google Fonts hiccup failed a Render build in next/font.
const interTight = localFont({
  src: "./fonts/inter-tight-latin.woff2",
  variable: "--font-inter-tight",
  weight: "500 700",
  display: "swap",
});

// Google tag (gtag.js): the Ads account loads the library; GA4 is a second config on it.
const GOOGLE_TAG_ID = "AW-18516509424";
const GA4_ID = "G-ZMK8KE4VM9";
// Meta (Facebook) Pixel.
const META_PIXEL_ID = "1421438440165577";

const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  variable: "--font-inter",
  weight: "400 600",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Zatch - Shop Live. Name Your Price.",
    template: "%s · Zatch",
  },
  description:
    "Zatch is India's first live bargain marketplace. Watch sellers go live, discover products through short videos, and negotiate your price in real time.",
  // The store. zatch.shop is the separate marketing site, which answers every
  // path with its landing page, so share and canonical links must not point there.
  metadataBase: new URL("https://live.zatch.shop"),
  openGraph: { type: "website", siteName: "Zatch" },
  verification: { google: "qUUEfX4LVyBz5OqcvWL_E80sPvOAh4n1a_a3CZAg1jc" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${interTight.variable} ${inter.variable}`}>
      <body suppressHydrationWarning>
        {/* The tag bootstraps are plain synchronous scripts so fbq/gtag exist before
            hydration: events fired from mount effects (ViewContent, the product-view
            conversion, Search) were silently dropped while these loaded
            afterInteractive. The heavy libraries still load async. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_TAG_ID}');
gtag('config', '${GA4_ID}');`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`,
          }}
        />
        {/* First Tab stop: skips the header and category bar (30 presses to Add to cart without it). */}
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-surface">
          Skip to content
        </a>
        <AuthProvider>
          <RealtimeProvider>{children}</RealtimeProvider>
        </AuthProvider>
        <AppPrompt />
        {/* afterInteractive on purpose: gtag() already exists from the inline bootstrap above, so
            events queue in dataLayer until this loads. beforeInteractive makes Next.js wait for
            Google's script before any page becomes interactive. */}
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`} strategy="afterInteractive" />
        <noscript>
          <img height="1" width="1" style={{ display: "none" }} alt=""
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} />
        </noscript>
      </body>
    </html>
  );
}
