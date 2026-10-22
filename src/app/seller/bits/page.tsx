import Link from "next/link";
import { Eye, TrendingUp, Activity, Play, Heart, MessageCircle, ShoppingBag, X } from "lucide-react";
import { SellerShell, SellerHeader, EmptyState } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { BecomeSeller } from "@/components/seller/become-seller";
import { ProductMedia } from "@/components/ui/product-media";
import { UploadBit } from "@/components/seller/upload-bit";
import { BitActions, BitCommentForm } from "@/components/seller/bit-actions";
import { bits as bitsApi, products as productsApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { sellerGate } from "@/lib/seller-gate";
import { compact, inr } from "@/lib/utils";
import type { Bit, Product } from "@/lib/types";

export const metadata = { title: "Seller · Bits" };

// The dashboard sends status as "Active" | "Inactive" and per-Bit sales under statsSummary / numberOfOrders.
type BitStats = {
  status?: string;
  numberOfOrders?: number;
  statsSummary?: { views?: number; revenue?: number; avgEngagement?: number; totalOrders?: number; addToCarts?: number; zatches?: number };
  comments?: { user?: { username?: string }; text: string; timestamp?: string }[];
  products?: Product[];
  hashtags?: string[];
  createdOn?: string;
};
// A dashboard Bit: products come fully populated and comments in the dashboard's own shape.
type SellerBit = Omit<Bit, "products" | "comments"> & BitStats;

// The server's timeFilter values; anything else means this week.
const PERIODS = [
  { key: "", label: "This week", filter: undefined },
  { key: "month", label: "This month", filter: "This Month" },
  { key: "year", label: "This year", filter: "This Year" },
];
type Dash = {
  performanceSummary?: { views?: number; revenue?: string; avgEngagement?: string };
  buyBits?: SellerBit[];
};

export default async function SellerBitsPage({ searchParams }: { searchParams: Promise<{ period?: string; bit?: string }> }) {
  const { period: requested, bit: openId } = await searchParams;
  const period = PERIODS.find((p) => p.key && p.key === requested) ?? PERIODS[0];
  const href = (bit?: string) => {
    const q = new URLSearchParams({ ...(period.key ? { period: period.key } : {}), ...(bit ? { bit } : {}) }).toString();
    return q ? `/seller/bits?${q}` : "/seller/bits";
  };

  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="your Bits" /></div></SellerShell>;

  const gate = await sellerGate(t);
  if (!gate.approved) return <SellerShell><BecomeSeller status={gate.status} display={gate.display} /></SellerShell>;

  const [dash, myProducts] = await Promise.all([
    bitsApi.dashboard(t, period.filter) as Promise<Dash | null>,
    productsApi.myProducts(t) as Promise<Product[] | null>,
  ]);

  const perf = dash?.performanceSummary ?? {};
  const list = dash?.buyBits ?? [];
  const open = list.find((b) => b._id === openId);

  const kpis = [
    { icon: Eye, label: "Views", value: compact(perf.views ?? 0) },
    { icon: TrendingUp, label: "Revenue from Bits", value: perf.revenue ?? "₹0" },
    { icon: Activity, label: "Avg engagement", value: perf.avgEngagement ?? "0%" },
  ];

  return (
    <SellerShell>
      <SellerHeader
        title="Bits"
        sub="Short product videos that sell while you sleep."
        action={<UploadBit myProducts={myProducts ?? []} />}
      />

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={p.key ? `/seller/bits?period=${p.key}` : "/seller/bits"}
            aria-current={p.key === period.key ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${p.key === period.key ? "bg-ink text-surface" : "bg-surface-2 text-ink hover:bg-canvas"}`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="card rounded-[1.5rem] p-6">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-ink"><k.icon className="h-5 w-5" /></span>
            <p className="mt-3 font-display text-2xl font-semibold text-ink">{k.value}</p>
            <p className="text-[13px] text-muted">{k.label}</p>
          </div>
        ))}
      </div>

      {open && <BitDetails bit={open} myProducts={myProducts ?? []} closeHref={href()} />}

      <div className="mt-8">
        <h2 className="px-1 font-display text-xl font-semibold text-ink">Your Bits</h2>
        {list.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="No Bits yet" sub="Upload a short video to show your products in action." />
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {list.map((b) => (
              <div key={b._id} className="card overflow-hidden rounded-[1.25rem] p-2">
                <div className="relative aspect-[9/14] overflow-hidden rounded-xl bg-surface-2">
                  <ProductMedia src={b.thumbnail?.url} alt={b.title ?? "Bit"} tone="violet" sizes="200px" className="h-full w-full" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
                  <Link href={`${href(b._id)}#bit-details`} aria-label={`Details for ${b.title ?? "this Bit"}`} className="absolute inset-0" />
                  <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/85 text-ink">
                    <Play className="h-3 w-3 fill-current" />
                  </span>
                  <div className="absolute right-2 top-2 z-10">
                    <BitActions bitId={b._id} isActive={(b as BitStats).status?.toLowerCase() !== "inactive"} />
                  </div>
                  <div className="absolute inset-x-2 bottom-2">
                    <p className="line-clamp-1 text-[12px] font-semibold text-white">{b.title}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/80">
                      <span className="inline-flex items-center gap-0.5"><Eye className="h-3 w-3" />{compact(b.viewCount ?? 0)}</span>
                      <span className="inline-flex items-center gap-0.5"><Heart className="h-3 w-3" />{compact(b.likeCount ?? 0)}</span>
                      <span className="inline-flex items-center gap-0.5"><MessageCircle className="h-3 w-3" />{compact(b.commentCount ?? (b as BitStats).comments?.length ?? 0)}</span>
                    </div>
                  </div>
                </div>
                {/* per-reel funnel the API attributes to this Bit */}
                <div className="flex items-center justify-between px-1 pt-2 text-[11px] text-muted">
                  <span className="inline-flex items-center gap-1">
                    <ShoppingBag className="h-3 w-3" />{(b as BitStats).numberOfOrders ?? (b as BitStats).statsSummary?.totalOrders ?? 0} orders
                  </span>
                  <span className="font-medium text-ink">
                    ₹{((b as BitStats).statsSummary?.revenue ?? 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SellerShell>
  );
}

// The app's "Buy Bit Details": summary, products and comments, all from the dashboard response.
function BitDetails({ bit, myProducts, closeHref }: { bit: SellerBit; myProducts: Product[]; closeHref: string }) {
  const s = bit.statsSummary ?? {};
  const summary = [
    ["Views", compact(s.views ?? bit.viewCount ?? 0)],
    ["Revenue", inr(s.revenue ?? 0)],
    ["Engagement", `${s.avgEngagement ?? 0}%`],
    ["Orders", String(s.totalOrders ?? 0)],
    ["Add to carts", String(s.addToCarts ?? 0)],
    ["Zatches", String(s.zatches ?? 0)],
  ];
  const comments = bit.comments ?? [];
  return (
    <section id="bit-details" aria-label="Bit details" className="card mt-6 scroll-mt-24 rounded-[1.75rem] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-ink">{bit.title ?? "Bit"}</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            {bit.status ?? "Active"}
            {bit.createdOn ? ` · posted ${new Date(bit.createdOn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}
          </p>
        </div>
        <Link href={closeHref} scroll={false} aria-label="Close details" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink">
          <X className="h-4 w-4" />
        </Link>
      </div>
      {bit.description && <p className="mt-3 text-sm text-ink-soft">{bit.description}</p>}

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {summary.map(([k, v]) => (
          <div key={k} className="rounded-xl bg-surface-2 py-2.5">
            <p className="text-[15px] font-semibold text-ink">{v}</p>
            <p className="text-[11px] text-muted">{k}</p>
          </div>
        ))}
      </div>

      <h3 className="mt-6 text-[13px] font-semibold uppercase tracking-widest text-muted">Products ({bit.products?.length ?? 0})</h3>
      <ul className="mt-2 space-y-2">
        {(bit.products ?? []).map((p) => (
          <li key={p._id} className="flex items-center gap-3 rounded-2xl border border-hairline p-2.5">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-2">
              <ProductMedia src={p.images?.[0]?.url} alt={p.name} sizes="48px" className="h-full w-full" />
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/product/${p._id}`} className="line-clamp-1 text-[14px] font-medium text-ink hover:underline">{p.name}</Link>
              <p className="text-[12px] text-muted">
                Cost <span className="font-semibold text-ink">{inr(p.discountedPrice ?? p.price)}</span>
                {p.discountedPrice != null && p.discountedPrice < p.price && <span className="ml-1 line-through">{inr(p.price)}</span>}
                {" · "}Stock <span className="font-semibold text-ink">{p.totalStock ?? 0} units</span>
              </p>
            </div>
          </li>
        ))}
      </ul>

      <h3 className="mt-6 text-[13px] font-semibold uppercase tracking-widest text-muted">Comments ({comments.length})</h3>
      {comments.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No comments yet.</p>
      ) : (
        <ul className="mt-2 max-h-64 space-y-2.5 overflow-y-auto pr-1">
          {comments.map((c, i) => (
            <li key={i} className="text-[14px] leading-snug">
              <span className="font-semibold text-ink">{c.user?.username ?? "user"}</span> <span className="text-ink-soft">{c.text}</span>
            </li>
          ))}
        </ul>
      )}
      <BitCommentForm bitId={bit._id} />

      <div className="mt-5">
        <UploadBit
          myProducts={myProducts}
          edit={{ _id: bit._id, title: bit.title, description: bit.description, hashtags: bit.hashtags, products: (bit.products ?? []).map((p) => p._id) }}
        />
      </div>
    </section>
  );
}
