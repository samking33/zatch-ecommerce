import Link from "next/link";

// Sort, price filter and paging shared by All products and every category page, all
// passed to /product/filter.
export const SORTS = [
  { key: "", label: "Newest" },
  { key: "popular", label: "Popular" },
  { key: "price_asc", label: "Price ↑" },
  { key: "price_desc", label: "Price ↓" },
];
export const PAGE_SIZE = 40;

/** Reads page/min/max from the URL. A minimum above the maximum is swapped rather than
 *  sent as is, which matched nothing and read as an empty category. */
export function listingParams(sp: { page?: string; min?: string; max?: string }) {
  const page = Math.max(1, Math.min(500, Number.parseInt(sp.page ?? "1", 10) || 1));
  let min = sp.min ?? "", max = sp.max ?? "";
  if (min && max && Number(min) > Number(max)) [min, max] = [max, min];
  return { page, min, max };
}

export function SortBar({ current, href }: { current: string; href: (sort: string) => string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted">Sort:</span>
      {SORTS.map((s) => (
        <Link key={s.key} href={href(s.key)} aria-current={current === s.key ? "true" : undefined}
          className={`rounded-full px-3 py-1.5 font-medium transition-colors ${current === s.key ? "bg-ink text-surface" : "text-ink hover:bg-surface-2"}`}>
          {s.label}
        </Link>
      ))}
    </div>
  );
}

export function PriceFilter({ action, keep, min, max, stock, clearHref }: {
  action: string; keep: Record<string, string>; min: string; max: string; stock: string; clearHref: string;
}) {
  const input = "h-9 w-24 rounded-full border border-hairline bg-surface-2 px-3.5 text-ink placeholder:text-muted focus:border-ink focus:outline-none";
  return (
    <form action={action} className="mb-6 flex flex-wrap items-center gap-2 text-sm">
      {Object.entries(keep).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <span className="text-muted">Price</span>
      <input name="min" defaultValue={min} inputMode="numeric" placeholder="Min ₹" aria-label="Minimum price" className={input} />
      <span className="text-muted">-</span>
      <input name="max" defaultValue={max} inputMode="numeric" placeholder="Max ₹" aria-label="Maximum price" className={input} />
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-hairline px-3.5 py-1.5 text-ink">
        <input type="checkbox" name="stock" value="1" defaultChecked={stock === "1"} className="accent-ink" />
        In stock
      </label>
      <button type="submit" className="btn-ink rounded-full px-4 py-2 font-semibold">Apply</button>
      {(min || max || stock) && <Link href={clearHref} className="text-muted hover:text-ink">Clear</Link>}
    </form>
  );
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  if (pages <= 1) return null;
  const btn = "rounded-full border border-hairline px-4 py-2 font-medium text-ink hover:bg-surface-2";
  return (
    <nav aria-label="Pages" className="mt-8 flex items-center justify-center gap-3 text-sm">
      {page > 1 && <Link href={href(page - 1)} className={btn}>Previous</Link>}
      <span className="text-muted">Page {page} of {pages}</span>
      {page < pages && <Link href={href(page + 1)} className={btn}>Next</Link>}
    </nav>
  );
}

/** Builds a listing URL from the current params, with overrides; empty values and page 1 drop out. */
export function listingHref(base: string, current: Record<string, string>, over: Record<string, string | number>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...over })) if (v !== "" && !(k === "page" && Number(v) === 1)) p.set(k, String(v));
  const q = p.toString();
  return `${base}${q ? `?${q}` : ""}`;
}
