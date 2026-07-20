import Link from "next/link";
import { Store, Clock, XCircle, ArrowRight } from "lucide-react";
import type { SellerStatusDisplay } from "@/lib/api";

// Shown on any seller page when the user isn't an approved seller yet.
export function BecomeSeller({ status, display }: { status: string; display?: SellerStatusDisplay }) {
  const pending = status === "pending";
  const rejected = status === "rejected";
  const Icon = pending ? Clock : rejected ? XCircle : Store;

  return (
    <div className="card relative mt-2 grid place-items-center overflow-hidden rounded-[2rem] px-6 py-20 text-center">
      <div className="pointer-events-none absolute -top-10 h-56 w-56 rounded-full bg-lime/30 blur-3xl" />
      <div className="relative">
        <span className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${pending ? "bg-surface-2 text-ink" : "bg-ink text-surface"}`}>
          <Icon className="h-6 w-6" />
        </span>
        <h1 className="mt-5 font-display text-[clamp(1.8rem,4vw,2.6rem)] font-semibold text-ink">
          {display?.title ?? (pending ? "Application under review" : "Become a seller")}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-muted">
          {display?.description ??
            (pending
              ? "We're reviewing your details. You'll get access as soon as you're approved."
              : "Register as a seller to list products, go live, and start earning.")}
        </p>
        {!pending && (
          <Link href="/seller/register" className="pill-lime mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold">
            {display?.action?.label ?? (rejected ? "Re-apply" : "Register as seller")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
