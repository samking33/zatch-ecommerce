/** The backend serves legal/support docs as full HTML pages, so we embed them
 *  rather than re-typing the copy. The src MUST be the same-origin proxied path
 *  (via the /api/v1 rewrite), not the backend URL directly: the backend sets
 *  X-Frame-Options: SAMEORIGIN, so a cross-origin iframe is blocked and renders
 *  blank. Same-origin proxying keeps the frame's origin equal to the page's.
 *  ponytail: iframe over an HTML parser. */
export function DocFrame({ path, title }: { path: string; title: string }) {
  return (
    <iframe
      src={`/api/v1${path}`}
      title={title}
      className="h-[70vh] w-full rounded-[1.5rem] border border-hairline bg-surface"
    />
  );
}
