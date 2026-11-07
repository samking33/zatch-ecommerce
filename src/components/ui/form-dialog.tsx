"use client";

import { useEffect, useRef } from "react";

/** A form opened over the page in a native modal dialog (focus kept inside, Esc closes),
 *  instead of rendered inline where it pushed the page down. Mount it only while open. */
export function FormDialog({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      className="m-auto max-h-[92dvh] w-[min(32rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-[1.75rem] bg-transparent p-0 backdrop:bg-ink/50"
    >
      {children}
    </dialog>
  );
}

/** Filters a long product list by name: the pickers showed about 4 of 60 products with no search. */
export function matchesName(name: string | undefined, q: string) {
  return !q.trim() || (name ?? "").toLowerCase().includes(q.trim().toLowerCase());
}
