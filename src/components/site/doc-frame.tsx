const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

/** The backend serves legal/support docs as full HTML pages, so we embed them
 *  rather than re-typing the copy. ponytail: iframe over an HTML parser. */
export function DocFrame({ path, title }: { path: string; title: string }) {
  return (
    <iframe
      src={`${BASE}/api/v1${path}`}
      title={title}
      className="h-[70vh] w-full rounded-[1.5rem] border border-hairline bg-surface"
    />
  );
}
