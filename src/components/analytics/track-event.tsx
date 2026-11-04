"use client";

import { useEffect } from "react";
import { trackMeta } from "@/lib/analytics";

/** Fire a Meta Pixel standard event once on mount, for server-rendered pages that can't call fbq directly. */
export function TrackEvent({ event, params }: { event: string; params?: Record<string, unknown> }) {
  useEffect(() => {
    trackMeta(event, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
