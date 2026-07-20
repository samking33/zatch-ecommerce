import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const groups = [
  {
    title: "Shop",
    links: [
      ["All products", "/shop"],
      ["Live now", "/live"],
      ["Bits", "/bits"],
      ["Top picks", "/shop?sort=top"],
    ],
  },
  {
    title: "Sell",
    links: [
      ["Become a seller", "/sell"],
      ["Go live", "/sell"],
      ["Seller payouts", "/account"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Support", "/support"],
      ["Terms", "/terms"],
      ["Privacy", "/privacy"],
    ],
  },
];

export function Footer() {
  return (
    <footer className="px-3 pb-4 pt-6 sm:px-5">
      <div className="card mx-auto max-w-[1400px] rounded-[1.75rem] px-6 py-10 sm:px-10">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              India&apos;s first live bargain marketplace. Watch, negotiate, and
              own it — in real time.
            </p>
          </div>
          {groups.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">
                {g.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {g.links.map(([label, href]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-[15px] text-ink-soft transition-colors hover:text-ink"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-hairline pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Zatch. Made in India.</p>
          <p>Shop live. Name your price.</p>
        </div>
      </div>
    </footer>
  );
}
