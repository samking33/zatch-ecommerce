import { SellerShell, EmptyState } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { BecomeSeller } from "@/components/seller/become-seller";
import { LiveStudio } from "@/components/seller/live-studio";
import { live as liveApi } from "@/lib/api";
import { serverToken, userIdFromToken } from "@/lib/session";
import { sellerGate } from "@/lib/seller-gate";

export const metadata = { title: "Seller · Go live" };

export default async function LiveStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="your live" /></div></SellerShell>;

  const gate = await sellerGate(t);
  if (!gate.approved) return <SellerShell><BecomeSeller status={gate.status} display={gate.display} /></SellerShell>;

  const { id } = await params;
  const room = (await liveApi.details(id, t))?.sessionDetails;
  // Only the host gets a studio; the server also refuses publisher tokens to anyone else.
  if (!room || room.host?._id !== userIdFromToken(t)) {
    return <SellerShell><div className="pt-2"><EmptyState title="We couldn't find this live" sub="It may have been cancelled. Check your lives list." /></div></SellerShell>;
  }

  return (
    <SellerShell>
      <div className="pt-2">
        <LiveStudio room={room} />
      </div>
    </SellerShell>
  );
}
