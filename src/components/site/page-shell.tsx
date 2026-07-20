import { Nav } from "./nav";
import { Footer } from "./footer";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1400px] px-3 pb-8 pt-4 sm:px-5">
        {children}
      </main>
      <Footer />
    </>
  );
}

export function PageHeader({
  eyebrow,
  title,
  sub,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="px-1 py-8 sm:py-10">
      {eyebrow ? (
        <p className="text-[13px] font-semibold uppercase tracking-widest text-muted">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-2 font-display text-[clamp(2rem,4vw,3.2rem)] font-semibold text-ink">
        {title}
      </h1>
      {sub ? <p className="mt-2 max-w-xl text-[15px] text-muted">{sub}</p> : null}
    </div>
  );
}
