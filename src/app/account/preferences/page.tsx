"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { PageShell, PageHeader } from "@/components/site/page-shell";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { preferences as prefApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";
import type { Category } from "@/lib/types";

type Prefs = { categories?: string[] };

export default function PreferencesPage() {
  const [token, setToken] = useState<string | undefined>();
  const [ready, setReady] = useState(false);
  const [cats, setCats] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Straight after sign-in (?welcome=1): the app's "Let's find you something to shop for" step.
  const router = useRouter();
  const [welcome, setWelcome] = useState<{ next: string } | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    // Only same-site paths, so the link can't send people elsewhere.
    const next = q.get("next") ?? "/";
    if (q.get("welcome")) setWelcome({ next: next.startsWith("/") && !next.startsWith("//") ? next : "/" });
    const t = getToken();
    setToken(t); setReady(true);
    if (!t) { setLoading(false); return; }
    Promise.all([prefApi.categories(t), prefApi.get(t)]).then(([c, p]) => {
      setCats((c as Category[]) ?? []);
      setSelected(((p as Prefs)?.categories) ?? []);
      setLoading(false);
    });
  }, []);

  function toggle(slug: string) {
    setSelected((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]));
    setState("idle");
  }

  async function save() {
    if (!token) return;
    setState("saving");
    setError(null);
    const res = await prefApi.save({ categories: selected }, token);
    if (!res) { setState("idle"); setError("Couldn't save your choices. Try again."); return; }
    setState("saved");
    if (welcome) { router.push(welcome.next); router.refresh(); }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow={welcome ? "Welcome to Zatch" : "Account"}
        title={welcome ? "Let's find you something to shop for" : "Shopping preferences"}
        sub="Pick the categories you care about - we'll tune your feed to match."
      />

      {ready && !token ? (
        <SignInRequired what="your preferences" />
      ) : loading ? (
        <div className="card grid place-items-center rounded-[2rem] p-16 text-muted">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="card rounded-[2rem] p-6 sm:p-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cats.filter((c) => c.slug !== "explore-all").map((c) => {
              const on = selected.includes(c.slug);
              return (
                <button
                  key={c._id}
                  onClick={() => toggle(c.slug)}
                  aria-pressed={on}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                    on ? "border-ink bg-ink text-surface" : "border-hairline bg-surface-2 text-ink hover:border-ink"
                  }`}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface">
                    {c.image?.url
                      ? <Image src={c.image.url} alt="" width={40} height={40} className="h-full w-full object-cover" />
                      : <span className="text-xs font-semibold text-ink">{c.name[0]}</span>}
                  </span>
                  <span className="min-w-0 flex-1 text-[15px] font-medium">{c.name}</span>
                  {on && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>

          <button
            onClick={save}
            disabled={state === "saving" || selected.length === 0}
            className="pill-lime mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "saved" ? <Check className="h-4 w-4" /> : null}
            {state === "saved" ? "Saved" : `${welcome ? "Continue" : "Save preferences"}${selected.length ? ` (${selected.length})` : ""}`}
          </button>
          {welcome && (
            <Link href={welcome.next} className="ml-4 text-sm font-medium text-muted hover:text-ink">Skip for now</Link>
          )}
          {error && <p role="alert" className="mt-3 text-sm font-medium text-live">{error}</p>}
        </div>
      )}
    </PageShell>
  );
}
