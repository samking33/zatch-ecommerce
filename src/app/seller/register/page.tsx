import { SellerShell, SellerHeader } from "@/components/seller/seller-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { SellerRegister } from "@/components/seller/seller-register";
import { serverToken } from "@/lib/session";

export const metadata = { title: "Become a seller" };

export default async function SellerRegisterPage() {
  const t = await serverToken();
  if (!t) return <SellerShell><div className="pt-2"><SignInRequired what="seller registration" /></div></SellerShell>;

  return (
    <SellerShell>
      <SellerHeader title="Become a seller" sub="Three steps to start selling — shop details, pickup address, and bank info for payouts." />
      <SellerRegister />
    </SellerShell>
  );
}
