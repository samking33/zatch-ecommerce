import { PageShell, PageHeader } from "@/components/site/page-shell";

export const metadata = { title: "About" };

const stats = [
  ["5M+", "Shoppers"],
  ["120k", "Sellers live"],
  ["₹0", "Fixed prices"],
  ["4.8", "App rating"],
];

export default function AboutPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Our story"
        title="Commerce should feel like a conversation"
        sub="Zatch brings the energy of a real bazaar online — live sellers, short video, and prices you negotiate yourself."
      />
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map(([n, l]) => (
          <div key={l} className="card rounded-[1.5rem] p-6">
            <p className="font-display text-4xl font-semibold text-ink">{n}</p>
            <p className="mt-1 text-sm text-muted">{l}</p>
          </div>
        ))}
      </div>
      <div className="card mt-4 rounded-[2rem] p-8 sm:p-12">
        <p className="max-w-2xl font-display text-2xl font-semibold leading-snug text-ink">
          The next evolution of shopping in India is content-led,
          community-driven, and negotiation-enabled.
        </p>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
          We started Zatch because online stores flattened everything that made
          shopping human — the demo, the haggle, the trust between buyer and
          seller. Live bargaining puts all of that back, at internet scale.
        </p>
      </div>
    </PageShell>
  );
}
