"use client";

import { useState } from "react";
import { Rail } from "./rail";
import { VideoRailCard } from "./rail-cards";
import { BitModal } from "@/components/bits/bit-modal";
import type { Bit } from "@/lib/types";

/** A rail of shoppable videos. Owns the player modal so any card can open it. */
export function VideoRail({
  title,
  sub,
  href,
  bits,
}: {
  title: string;
  sub?: string;
  href?: string;
  bits: Bit[];
}) {
  const [active, setActive] = useState<Bit | null>(null);

  return (
    <>
      <Rail title={title} sub={sub} href={href}>
        {bits.map((b) => (
          <VideoRailCard key={b._id} bit={b} onOpen={() => setActive(b)} />
        ))}
      </Rail>
      {active && <BitModal bit={active} onClose={() => setActive(null)} />}
    </>
  );
}
