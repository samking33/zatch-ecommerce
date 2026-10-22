import { PageShell, PageHeader } from "@/components/site/page-shell";
import { DocFrame } from "@/components/site/doc-frame";
import { Faq } from "@/components/support/faq";

export const metadata = { title: "Support" };

export default function Page() {
  return (
    <PageShell>
      <PageHeader eyebrow="Help" title="Support" />
      <Faq />
      <DocFrame path="/contact/support" title="Support" />
    </PageShell>
  );
}
