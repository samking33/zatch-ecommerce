// Globals created by the tag bootstraps in app/layout.tsx.
export {};

declare global {
  type Gtag = (command: "js" | "config" | "set" | "event" | "consent", target: string | Date, params?: Record<string, unknown>) => void;
  type Fbq = (command: string, event: string, params?: Record<string, unknown>, opts?: Record<string, unknown>) => void;

  interface Window {
    gtag?: Gtag;
    fbq?: Fbq;
    dataLayer?: unknown[];
  }
}
