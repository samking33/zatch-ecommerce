import Link from "next/link";
import Image from "next/image";
import { Star, Package, Users as UsersIcon } from "lucide-react";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { users } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { compact } from "@/lib/utils";

export const metadata = { title: "Sellers" };
export const dynamic = "force-dynamic";

type SellerRow = {
  _id: string;
  username?: string;
  name?: string;
  businessName?: string;
  profilePic?: { url?: string };
  sellerCategories?: string[];
  followerCount?: number;
  customerRating?: number;
  productsSoldCount?: number;
  activeProductCount?: number;
  activeBitsCount?: number;
};

export default async function SellersPage() {
  const list = ((await users.all(await serverToken())) as SellerRow[] | null) ?? [];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Community"
        title="Sellers on Zatch"
        sub={`${list.length} sellers going live, dropping Bits, and open to offers.`}
      />

      {list.length === 0 ? (
        <div className="card grid place-items-center rounded-[2rem] px-6 py-16 text-center">
          <p className="text-muted">No sellers to show right now.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => {
            const name = s.businessName || s.name || s.username || "Seller";
            return (
              <Link key={s._id} href={`/seller/${s._id}`} className="card card-hover flex items-center gap-4 rounded-[1.5rem] p-5">
                <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface-2 text-lg font-semibold text-ink">
                  {s.profilePic?.url
                    ? <Image src={s.profilePic.url} alt={name} width={56} height={56} className="h-full w-full object-cover" />
                    : name[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-display text-[15px] font-semibold text-ink">{name}</p>
                  {!!s.sellerCategories?.length && (
                    <p className="line-clamp-1 text-[13px] text-muted">{s.sellerCategories.slice(0, 2).join(" · ")}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-3 text-[12px] text-muted">
                    <span className="inline-flex items-center gap-1"><UsersIcon className="h-3 w-3" />{compact(s.followerCount ?? 0)}</span>
                    <span className="inline-flex items-center gap-1"><Package className="h-3 w-3" />{s.activeProductCount ?? 0}</span>
                    {(s.customerRating ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-lime text-lime" />{s.customerRating}</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
