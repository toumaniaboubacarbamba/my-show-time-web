"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authApi, tokenStore } from "./api";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Au chargement : si un token existe, on récupère le profil
  useEffect(() => {
    let cancelled = false;
    const request = tokenStore.get() ? authApi.me() : Promise.resolve(null);
    request
      .then((me) => !cancelled && setUser(me))
      .catch(() => tokenStore.clear())
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const token = await authApi.login(email, password);
    tokenStore.set(token);
    const me = await authApi.me();
    setUser(me);
    return me;
  }, []);

  const register = useCallback(
    async (email: string, password: string) => {
      await authApi.register(email, password);
      return login(email, password);
    },
    [login],
  );

  // Recharge le profil (ex. après un changement d'email). Si le token n'est plus
  // valable, on déconnecte proprement.
  const refresh = useCallback(async () => {
    try {
      setUser(await authApi.me());
    } catch {
      tokenStore.clear();
      setUser(null);
    }
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh }),
    [user, loading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
