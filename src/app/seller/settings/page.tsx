import Link from "next/link";
import { Store } from "lucide-react";
import { SellerShell, SellerHeader } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { BecomeSeller } from "@/components/seller/become-seller";
import { GlobalBargainForm } from "@/components/seller/global-bargain-form";
import { SellerRegister } from "@/components/seller/seller-register";
import { Faq, SELLER_FAQS } from "@/components/support/faq";
import { LogoutButton } from "@/components/auth/logout-button";
import { users, seller } from "@/lib/api";
import { serverToken, userIdFromToken } from "@/lib/session";
import { sellerGate } from "@/lib/seller-gate";

export const metadata = { title: "Seller · Settings" };
export const dynamic = "force-dynamic";

type Profile = { globalBargainSettings?: { enabled?: boolean; autoAcceptDiscount?: number; maximumDiscount?: number } };

// The app's seller profile screen: business details, auto bargain settings, help, log out.
export default async function SellerSettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="seller settings" /></div></SellerShell>;

  const gate = await sellerGate(t);
  if (!gate.approved) return <SellerShell><BecomeSeller status={gate.status} display={gate.display} /></SellerShell>;

  const { tab } = await searchParams;
  const [profile, status] = await Promise.all([users.profile(t) as Promise<Profile | null>, seller.status(t)]);

  return (
    <SellerShell>
      <SellerHeader
        title="Settings"
        sub="Your business details, bargain rules and help."
        action={
          <Link href={`/seller/${userIdFromToken(t)}`} className="inline-flex items-center gap-2 rounded-full border border-hairline px-5 py-2.5 text-sm font-medium text-ink hover:bg-surface-2">
            <Store className="h-4 w-4" /> View your shop
          </Link>
        }
      />

      <section id="business" className="scroll-mt-24">
        <h2 className="mb-3 px-1 font-display text-xl font-semibold text-ink">Business details</h2>
        <SellerRegister draft={status?.sellerProfile} edit initialTab={tab === "bank" ? 3 : tab === "address" ? 2 : 1} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 px-1 font-display text-xl font-semibold text-ink">Auto bargain settings</h2>
        <GlobalBargainForm initial={profile?.globalBargainSettings} />
      </section>

      <section className="mt-8">
        <Faq items={SELLER_FAQS} />
      </section>

      <LogoutButton />
    </SellerShell>
  );
}
