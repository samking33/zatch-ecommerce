import { PageShell } from "@/components/site/page-shell";
import { LiveRoom } from "@/components/live/live-room";
import { catalog, live } from "@/lib/api";
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
  const t = await serverToken();

  // Prefer the per-session details endpoint; fall back to the sessions list.
  const detail = await live.details(sessionId, t);
  const fromDetail = (detail?.session ?? detail) as LiveSession | undefined;
  const session =
    fromDetail?._id
      ? fromDetail
      : ((await catalog.liveSessions(t)) ?? []).find((s) => s._id === sessionId || s.channelName === sessionId);

  return (
    <PageShell>
      <div className="pt-4">
        <LiveRoom
          sessionId={session?._id ?? sessionId}
          title={session?.title ?? "Live drop"}
          productId={typeof session?.productId === "string" ? session.productId : session?.productId?._id}
          listPrice={session?.productId && typeof session.productId === "object" ? session.productId.price : undefined}
          viewers={session?.viewersCount}
        />
      </div>
    </PageShell>
  );
}
