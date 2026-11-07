import { SellerShell, SellerHeader } from "@/components/seller/seller-shell";
import { serverToken } from "@/lib/session";
import { DocBody } from "@/components/site/doc-body";

export const metadata = { title: "Seller · Terms" };

export default async function SellerTermsPage() {
  const token = await serverToken();

  return (
    <SellerShell>
      <SellerHeader title="Seller terms" sub="The agreement you accept when selling on Zatch." />
      {token ? (
        // The seller terms need the seller's own sign-in, so they are fetched with their token.
        <DocBody path="/user/seller/terms-and-conditions" token={token} />
      ) : (
        <div className="card grid place-items-center rounded-[1.5rem] px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold text-ink">Sign in to view the seller terms</p>
          <p className="mt-2 text-sm text-muted">You need to be signed in as a seller to view this agreement.</p>
        </div>
      )}
    </SellerShell>
  );
}
