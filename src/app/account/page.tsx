import Link from "next/link";
import { Package, Tag, MapPin, Heart, Bell, Store, ChevronRight } from "lucide-react";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { LogoutButton } from "@/components/auth/logout-button";
import { AccountForms } from "@/components/account/account-forms";
import { users } from "@/lib/api";
import { serverToken } from "@/lib/session";
import type { SessionUser } from "@/lib/client-auth";

export const metadata = { title: "Account" };

const links = [
  ["My orders", "/orders", Package],
  ["My bargains", "/bargains", Tag],
  ["Addresses", "/account/addresses", MapPin],
  ["Wishlist", "/wishlist", Heart],
  ["Notifications", "/notifications", Bell],
  ["Seller dashboard", "/seller/dashboard", Store],
] as const;

export default async function AccountPage() {
  const t = await serverToken();
  if (!t) {
    return (
      <PageShell>
        <div className="pt-6">
          <SignInRequired what="your account" />
        </div>
      </PageShell>
    );
  }

  const user = (await users.profile(t)) as SessionUser | null;
  const name = user?.username ?? "there";
  const initial = (user?.username?.[0] ?? "Z").toUpperCase();

  return (
    <PageShell>
      <PageHeader eyebrow="Account" title={`Hi, ${name}`} />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="card h-fit rounded-[1.75rem] p-6">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-ink text-2xl font-semibold text-surface">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold text-ink">{user?.username}</p>
              {user?.phone && (
                <p className="text-sm text-muted">
                  {(user.countryCode as string) ?? ""} {user.phone}
                </p>
              )}
              {user?.email && <p className="truncate text-sm text-muted">{user.email}</p>}
            </div>
          </div>
          <div className="mt-6">
            <LogoutButton />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card rounded-[1.75rem] p-3">
            {links.map(([label, href, Icon]) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-colors hover:bg-surface-2"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-ink">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="font-medium text-ink">{label}</span>
                <ChevronRight className="ml-auto h-4 w-4 text-muted" />
              </Link>
            ))}
          </div>
          <AccountForms user={user} />
        </div>
      </div>
    </PageShell>
  );
}
