import { PageShell, PageHeader } from "@/components/site/page-shell";
import { DocBody } from "@/components/site/doc-body";

export const metadata = { title: "Terms & conditions" };

export default function Page() {
  return (
    <PageShell>
      <PageHeader eyebrow="Legal" title="Terms & conditions" />
      <DocBody path="/terms-and-conditions" />
    </PageShell>
  );
}
