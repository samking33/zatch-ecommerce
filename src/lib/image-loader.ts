// Product photos are resized by the Bunny CDN at the edge (?width=), not by this server.
// On the 0.5-CPU web instance, Next's own resizer (sharp) timed out on large phone photos,
// leaving blank cards, and its CPU spikes took the whole site down with 502s.
// Anything not on the CDN (the logo, local previews) is served as it is.
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  if (!/^https:\/\/[^/]+\.b-cdn\.net\//i.test(src)) return src;
  const url = new URL(src);
  url.searchParams.set("width", String(width));
  url.searchParams.set("quality", String(quality ?? 75));
  return url.toString();
}
