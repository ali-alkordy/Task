// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as AuthService from "../services/Auth/auth.service";

export type AuthUser = {
  uid: string;
  email: string;
};

type AuthValue = {
  user: AuthUser | null;
  hydrated: boolean;
  isAuthenticated: boolean;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // ✅ Hydrate from stored accessToken
  useEffect(() => {
    const session = AuthService.getSession();
    setUser(session?.user ?? null);
    setHydrated(true);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      hydrated,
      isAuthenticated: !!user,

      register: async (email, password) => {
        const u = await AuthService.register(email, password);
        setUser(u);
      },

      login: async (email, password) => {
        const u = await AuthService.login(email, password);
        setUser(u);
      },

      logout: async () => {
        await AuthService.logout();
        setUser(null);
      },
    }),
    [user, hydrated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
