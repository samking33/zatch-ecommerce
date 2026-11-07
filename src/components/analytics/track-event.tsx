"use client";

import { useEffect } from "react";
import { trackSearch } from "@/lib/analytics";

/** Reports a search once on mount, since the results page is server-rendered and can't call the tags itself. */
export function TrackSearch({ term }: { term: string }) {
  useEffect(() => {
    if (term) trackSearch(term);
  }, [term]);
  return null;
}
