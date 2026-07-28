"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onEvent, type ServerEvents } from "@/lib/socket";

/** Re-fetch this server component's data whenever one of these socket events
 *  fires. Keeps bargain/order lists live without hand-rolling client state. */
export function RefreshOn({ events }: { events: (keyof ServerEvents)[] }) {
  const router = useRouter();
  useEffect(() => {
    const offs = events.map((e) => onEvent(e, () => router.refresh()));
    return () => offs.forEach((off) => off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, events.join(",")]);
  return null;
}
