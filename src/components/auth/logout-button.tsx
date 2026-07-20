"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "./auth-provider";

export function LogoutButton() {
  const router = useRouter();
  const { logout } = useAuth();
  return (
    <button
      onClick={() => {
        logout();
        router.push("/");
        router.refresh();
      }}
      className="inline-flex items-center gap-2 rounded-full border border-hairline px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
    >
      <LogOut className="h-4 w-4" /> Sign out
    </button>
  );
}
