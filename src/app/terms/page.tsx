import { PageShell, PageHeader } from "@/components/site/page-shell";
import { DocFrame } from "@/components/site/doc-frame";

export const metadata = { title: "Terms & conditions" };

export default function Page() {
  return (
    <PageShell>
      <PageHeader eyebrow="Legal" title="Terms & conditions" />
      <DocFrame path="/terms-and-conditions" title="Terms & conditions" />
    </PageShell>
  );
}
