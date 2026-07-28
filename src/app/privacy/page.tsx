import { PageShell, PageHeader } from "@/components/site/page-shell";
import { DocFrame } from "@/components/site/doc-frame";

export const metadata = { title: "Privacy policy" };

export default function Page() {
  return (
    <PageShell>
      <PageHeader eyebrow="Legal" title="Privacy policy" />
      <DocFrame path="/privacy-policy" title="Privacy policy" />
    </PageShell>
  );
}
