import { SellerShell, SellerHeader } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { BecomeSeller } from "@/components/seller/become-seller";
import { GlobalBargainForm } from "@/components/seller/global-bargain-form";
import { users } from "@/lib/api";
import { serverToken } from "@/lib/session";
import { sellerGate } from "@/lib/seller-gate";

export const metadata = { title: "Seller · Settings" };
export const dynamic = "force-dynamic";

type Profile = { globalBargainSettings?: { enabled?: boolean; autoAcceptDiscount?: number; maximumDiscount?: number } };

export default async function SellerSettingsPage() {
  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="seller settings" /></div></SellerShell>;

  const gate = await sellerGate(t);
  if (!gate.approved) return <SellerShell><BecomeSeller status={gate.status} display={gate.display} /></SellerShell>;

  const profile = (await users.profile(t)) as Profile | null;

  return (
    <SellerShell>
      <SellerHeader
        title="Bargain settings"
        sub="Set defaults that apply across every product you list."
      />
      <GlobalBargainForm initial={profile?.globalBargainSettings} />
    </SellerShell>
  );
}
