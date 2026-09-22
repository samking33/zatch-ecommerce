import { SellerShell, SellerHeader } from "@/components/seller/seller-shell";
import { serverToken } from "@/lib/session";

export const metadata = { title: "Seller · Terms" };

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

/** The seller terms endpoint is auth-gated, so an iframe cannot load it (no way
 *  to attach the JWT, and the backend also frame-blocks cross-origin). Fetch it
 *  server-side with the seller's own token and render the returned HTML through
 *  a srcDoc iframe, which needs no network request and no framing headers. */
export default async function SellerTermsPage() {
  const token = await serverToken();

  let html = "";
  if (token) {
    try {
      const res = await fetch(`${BASE}/api/v1/user/seller/terms-and-conditions`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) html = await res.text();
    } catch {
      // fall through to the sign-in / retry message below
    }
  }

  return (
    <SellerShell>
      <SellerHeader title="Seller terms" sub="The agreement you accept when selling on Zatch." />
      {html ? (
        <iframe
          srcDoc={html}
          title="Seller terms and conditions"
          className="h-[70vh] w-full rounded-[1.5rem] border border-hairline bg-surface"
        />
      ) : (
        <div className="card grid place-items-center rounded-[1.5rem] px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold text-ink">
            {token ? "Couldn't load the seller terms" : "Sign in to view the seller terms"}
          </p>
          <p className="mt-2 text-sm text-muted">
            {token
              ? "Please refresh in a moment, or contact support if this keeps happening."
              : "You need to be signed in as a seller to view this agreement."}
          </p>
        </div>
      )}
    </SellerShell>
  );
}
