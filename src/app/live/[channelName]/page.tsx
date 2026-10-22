import { PageShell } from "@/components/site/page-shell";
import { LiveRoom } from "@/components/live/live-room";
import { catalog, live, type LiveDetails } from "@/lib/api";
import { serverToken } from "@/lib/session";

export const metadata = { title: "Live room" };

// The route param carries the live session id.
export default async function LiveRoomPage({
  params,
}: {
  params: Promise<{ channelName: string }>;
}) {
  const { channelName: sessionId } = await params;
  const t = await serverToken();

  // The details endpoint needs a sign-in; signed-out visitors get the basics from the public list.
  const details = (await live.details(sessionId, t))?.sessionDetails;
  const listed = details ? undefined : ((await catalog.liveSessions(t)) ?? []).find((s) => s._id === sessionId || s.channelName === sessionId);
  const room: LiveDetails = details ?? {
    _id: listed?._id ?? sessionId,
    title: listed?.title,
    status: listed?.status,
    viewersCount: listed?.viewersCount,
  };

  return (
    <PageShell>
      <div className="pt-4">
        <LiveRoom room={room} />
      </div>
    </PageShell>
  );
}
