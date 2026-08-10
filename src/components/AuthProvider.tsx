"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { checkIsAdmin, onAuthChange } from "@/lib/auth";

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  /** true selama status login awal belum diketahui */
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  isAdmin: false,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAdmin: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthChange(async (user) => {
      // Tandai admin dulu sebagai false supaya UI tidak sempat menampilkan
      // konten kasir memakai status admin milik user sebelumnya.
      if (!cancelled) setState({ user, isAdmin: false, loading: true });

      const isAdmin = await checkIsAdmin(user);
      if (!cancelled) setState({ user, isAdmin, loading: false });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
