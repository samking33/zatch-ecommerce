import { seller } from "./api";
import type { SellerStatusDisplay } from "./api";

const APPROVED = ["approved", "active"];

// A buyer becomes a seller only after KYC onboarding + admin approval. Seller
// pages use this to decide whether to show the console or the onboarding gate.
export async function sellerGate(token: string): Promise<{
  approved: boolean;
  status: string;
  display?: SellerStatusDisplay;
}> {
  const res = await seller.status(token);
  const status = (res?.sellerStatus ?? "buyer").toLowerCase();
  return { approved: APPROVED.includes(status), status, display: res?.statusDisplay };
}
