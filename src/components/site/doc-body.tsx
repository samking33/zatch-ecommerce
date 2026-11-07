import "server-only";

// Same fallback as lib/api.ts and the /api rewrite.
const BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8080";

/** The backend serves the legal pages as full static HTML documents. They are fetched here
 *  and their body is rendered as part of the page, in the site's own type, instead of in a
 *  scrolling iframe box with its own design.
 *  ponytail: no sanitizer. This is trusted copy: the backend serves fixed templates with nothing
 *  user-editable in them. The cut-down below only drops the obvious (scripts, handlers); it is
 *  not a sanitizer, so if this copy ever becomes editable it needs a real one. */
export async function DocBody({ path, token }: { path: string; token?: string }) {
  let html = "";
  try {
    const res = await fetch(`${BASE}/api/v1${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // Public copy changes rarely; the seller's copy is per-account.
      ...(token ? { cache: "no-store" as const } : { next: { revalidate: 3600 } }),
    });
    if (res.ok) html = await res.text();
  } catch {
    // shown as the message below
  }
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? "";
  const clean = body
    .replace(/<(script|style|iframe|object|embed|form)[\s\S]*?<\/\1>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, "");
  // The page header already shows the title, so drop the copy's own title heading (an h1, or the
  // seller terms' h2) when it comes before any text.
  const title = /<h([12])[^>]*>[\s\S]*?<\/h\1>/i.exec(clean);
  const firstText = clean.search(/<p[\s>]/i);
  const copy = title && (firstText < 0 || title.index < firstText) ? clean.slice(0, title.index) + clean.slice(title.index + title[0].length) : clean;

  if (!copy.trim()) {
    return (
      <div className="card grid place-items-center rounded-[1.5rem] px-6 py-16 text-center">
        <p className="font-display text-lg font-semibold text-ink">Couldn&apos;t load this page</p>
        <p className="mt-2 text-sm text-muted">Please refresh in a moment.</p>
      </div>
    );
  }
  return <article className="doc card rounded-[1.5rem] px-5 py-6 sm:px-10 sm:py-10" dangerouslySetInnerHTML={{ __html: copy }} />;
}
