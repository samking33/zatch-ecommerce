import { SellerShell, SellerHeader } from "@/components/seller/seller-shell";
import { DocFrame } from "@/components/site/doc-frame";

export const metadata = { title: "Seller · Terms" };

export default function SellerTermsPage() {
  return (
    <SellerShell>
      <SellerHeader title="Seller terms" sub="The agreement you accept when selling on Zatch." />
      <DocFrame path="/user/seller/terms-and-conditions" title="Seller terms and conditions" />
    </SellerShell>
  );
}
