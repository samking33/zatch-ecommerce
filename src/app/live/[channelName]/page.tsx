import { PageShell } from "@/components/site/page-shell";
import { LiveRoom } from "@/components/live/live-room";
import { catalog } from "@/lib/api";
import { serverToken } from "@/lib/session";
import type { LiveSession } from "@/lib/types";

export const metadata = { title: "Live room" };

// The route param carries the live session id.
export default async function LiveRoomPage({
  params,
}: {
  params: Promise<{ channelName: string }>;
}) {
  const { channelName: sessionId } = await params;
  const sessions = (await catalog.liveSessions(await serverToken())) ?? [];
  const session = (sessions as LiveSession[]).find((s) => s._id === sessionId || s.channelName === sessionId);
  const title = session?.title ?? "Live drop";

  return (
    <PageShell>
      <div className="pt-4">
        <LiveRoom
          sessionId={session?._id ?? sessionId}
          title={title}
          viewers={session?.viewersCount}
        />
      </div>
    </PageShell>
  );
}
