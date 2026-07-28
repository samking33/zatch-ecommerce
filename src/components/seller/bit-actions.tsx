"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, EyeOff, Trash2, Loader2 } from "lucide-react";
import { bits as bitsApi } from "@/lib/api";
import { getToken } from "@/lib/client-auth";

/** Seller reel actions → PATCH /bits/:id/action (Activate | Deactivate | Delete). */
export function BitActions({ bitId, isActive = true }: { bitId: string; isActive?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(action: "Activate" | "Deactivate" | "Delete") {
    const t = getToken();
    if (!t) return;
    if (action === "Delete" && !window.confirm("Delete this Bit? This can't be undone.")) return;
    setBusy(action);
    await bitsApi.action(bitId, { action }, t);
    setBusy(null);
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Bit actions"
        className="grid h-7 w-7 place-items-center rounded-full bg-white/85 text-ink backdrop-blur"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-hairline bg-surface shadow-lg">
          {isActive ? (
            <Item onClick={() => run("Deactivate")} icon={EyeOff} label="Deactivate" />
          ) : (
            <Item onClick={() => run("Activate")} icon={Eye} label="Activate" />
          )}
          <Item onClick={() => run("Delete")} icon={Trash2} label="Delete" danger />
        </div>
      )}
    </div>
  );
}

function Item({ onClick, icon: Icon, label, danger }: { onClick: () => void; icon: typeof Eye; label: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors hover:bg-surface-2 ${danger ? "text-live" : "text-ink"}`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
