import { PageShell } from "@/components/site/page-shell";
import { LiveRoom } from "@/components/live/live-room";

export const metadata = { title: "Live room" };

export default async function LiveRoomPage({
  params,
}: {
  params: Promise<{ channelName: string }>;
}) {
  const { channelName } = await params;
  const title = channelName
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <PageShell>
      <div className="pt-4">
        <LiveRoom title={`${title} — flash bargains`} />
      </div>
    </PageShell>
  );
}
