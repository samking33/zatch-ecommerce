"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  getUser,
  clearSession,
  isTokenExpired,
  type SessionUser,
} from "@/lib/client-auth";

type AuthCtx = {
  user: SessionUser | null;
  setUser: (u: SessionUser | null) => void;
  logout: () => void;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  setUser: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    // Access tokens live 7 days. If the stored one has lapsed, clear the
    // session so the user sees "sign in" instead of silently empty pages.
    if (isTokenExpired()) {
      clearSession();
      setUser(null);
      return;
    }
    setUser(getUser());
  }, []);

  const logout = () => {
    clearSession();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, setUser, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
