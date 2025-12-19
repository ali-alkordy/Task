import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";


import { auth } from "../api/firebase";
import * as AuthService from "../services/Auth/auth.service";

type AuthValue = {
  user: User | null;
  hydrated: boolean;
  isAuthenticated: boolean;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setHydrated(true);
    });
    return () => unsub();
  }, []);

  const value = useMemo<AuthValue>(() => ({
    user,
    hydrated,
    isAuthenticated: !!user,
    register: async (email, password) => { await AuthService.register(email, password); },
    login: async (email, password) => { await AuthService.login(email, password); },
    logout: async () => { await AuthService.logout(); },
  }), [user, hydrated]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
