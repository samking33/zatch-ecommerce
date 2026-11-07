"use client";

import Link from "next/link";
import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { PageShell, PageHeader } from "@/components/site/page-shell";

// Without this, any failed page load (e.g. a dropped connection while sorting) replaced the
// whole page with Next's bare "Application error" and no way back but reloading.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  // reset() alone re-renders with the failed server result; refresh fetches it again.
  const retry = () => startTransition(() => { router.refresh(); reset(); });
  return (
    <PageShell>
      <PageHeader eyebrow="Something went wrong" title="This page didn't load" sub="It was probably the connection. Try again." />
      <div className="flex flex-wrap gap-3 px-1">
        <button onClick={retry} className="pill-lime rounded-full px-6 py-3 text-sm font-semibold">Try again</button>
        <Link href="/" className="rounded-full border border-hairline px-6 py-3 text-sm font-semibold text-ink hover:bg-surface-2">Go to home</Link>
      </div>
    </PageShell>
  );
}
