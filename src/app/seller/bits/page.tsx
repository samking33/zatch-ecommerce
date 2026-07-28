import { Eye, TrendingUp, Activity, Play, Heart, MessageCircle } from "lucide-react";
import { SellerShell, SellerHeader, EmptyState } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { BecomeSeller } from "@/components/seller/become-seller";
import { ProductMedia } from "@/components/ui/product-media";
import { UploadBit } from "@/components/seller/upload-bit";
import { bits as bitsApi, products as productsApi } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { sellerGate } from "@/lib/seller-gate";
import { compact } from "@/lib/utils";
import type { Bit, Product } from "@/lib/types";

export const metadata = { title: "Seller · Bits" };

type Dash = {
  performanceSummary?: { views?: number; revenue?: string; avgEngagement?: string };
  buyBits?: Bit[];
};

export default async function SellerBitsPage() {
  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="your Bits" /></div></SellerShell>;

  const gate = await sellerGate(t);
  if (!gate.approved) return <SellerShell><BecomeSeller status={gate.status} display={gate.display} /></SellerShell>;

  const [dash, myProducts] = await Promise.all([
    bitsApi.dashboard(t) as Promise<Dash | null>,
    productsApi.myProducts(t) as Promise<Product[] | null>,
  ]);

  const perf = dash?.performanceSummary ?? {};
  const list = dash?.buyBits ?? [];

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

      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="card rounded-[1.5rem] p-6">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-ink"><k.icon className="h-5 w-5" /></span>
            <p className="mt-3 font-display text-2xl font-semibold text-ink">{k.value}</p>
            <p className="text-[13px] text-muted">{k.label}</p>
          </div>
        ))}
      </div>

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
                  <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/85 text-ink">
                    <Play className="h-3 w-3 fill-current" />
                  </span>
                  <div className="absolute inset-x-2 bottom-2">
                    <p className="line-clamp-1 text-[12px] font-semibold text-white">{b.title}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/80">
                      <span className="inline-flex items-center gap-0.5"><Eye className="h-3 w-3" />{compact(b.viewCount ?? 0)}</span>
                      <span className="inline-flex items-center gap-0.5"><Heart className="h-3 w-3" />{compact(b.likeCount ?? 0)}</span>
                      <span className="inline-flex items-center gap-0.5"><MessageCircle className="h-3 w-3" />{compact(b.commentCount ?? 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SellerShell>
  );
}
