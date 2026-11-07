import { PageShell, PageHeader } from "@/components/site/page-shell";
import { DocBody } from "@/components/site/doc-body";

export const metadata = { title: "Privacy policy" };

export default function Page() {
  return (
    <PageShell>
      <PageHeader eyebrow="Legal" title="Privacy policy" />
      <DocBody path="/privacy-policy" />
    </PageShell>
  );
}
