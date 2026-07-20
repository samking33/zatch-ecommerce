import Link from "next/link";
import { Play, Heart, ShoppingBag } from "lucide-react";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { ProductOrb, type OrbTone } from "@/components/ui/product-orb";
import { compact } from "@/lib/utils";

export const metadata = { title: "Bits" };

const tones: OrbTone[] = ["violet", "coral", "cobalt", "lime", "slate"];
const bits = [
  { title: "Unboxing the Aurora", likes: 4200, views: 51000 },
  { title: "3 ways to style the Halo ring", likes: 2100, views: 33000 },
  { title: "Bass test — X-Bud Pro", likes: 3800, views: 47000 },
  { title: "Seller haul under ₹2k", likes: 1500, views: 22000 },
  { title: "Live drop highlights", likes: 5600, views: 88000 },
  { title: "Diffuser aesthetic setup", likes: 980, views: 14000 },
];

export default function BitsPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Short video shopping"
        title="Bits"
        sub="Swipe through short product videos. Tap to buy or make an offer, straight from the clip."
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {bits.map((b, i) => (
          <Link
            key={i}
            href="/bits"
            className="card card-hover group relative flex aspect-[9/14] flex-col justify-between overflow-hidden rounded-[1.5rem] p-4"
          >
            <div className="absolute inset-0 -z-0">
              <ProductOrb tone={tones[i % tones.length]} className="h-full w-full scale-110 opacity-90" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent" />
            </div>
            <div className="relative flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/85 text-ink backdrop-blur">
                <Play className="h-4 w-4 fill-current" />
              </span>
              <span className="rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                {compact(b.views)} views
              </span>
            </div>
            <div className="relative">
              <p className="font-display text-[15px] font-semibold leading-tight text-white">
                {b.title}
              </p>
              <div className="mt-2 flex items-center gap-3 text-white/85">
                <span className="inline-flex items-center gap-1 text-[13px]">
                  <Heart className="h-3.5 w-3.5 fill-current" /> {compact(b.likes)}
                </span>
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-lime px-3 py-1.5 text-[12px] font-semibold text-lime-ink">
                  <ShoppingBag className="h-3.5 w-3.5" /> Shop
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
