"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  getUser,
  clearSession,
  isTokenExpired,
  type SessionUser,
} from "@/lib/client-auth";
import { identify } from "@/lib/analytics";

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

  // Sign-in, sign-up and sign-out all pass through here, so attribution follows the
  // session. The first run is skipped: `null` then means "not loaded yet", not
  // "signed out", and would wipe an identity a page event already picked up.
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) identify(user);
    else loaded.current = true;
  }, [user]);

  const logout = () => {
    clearSession();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, setUser, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
