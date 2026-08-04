import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UserSession } from "@buildiq/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch, setToken } from "../api/client";
import { login as apiLogin, register as apiRegister } from "../api/resources";
import { MOCK_SESSION } from "../data/mock";

const AUTH_KEY = "buildiq.session";

type AuthContextValue = {
  session: UserSession | null;
  bootstrapped: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    name: string;
    email: string;
    password: string;
    companyName: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  signInDemo: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_KEY);
        if (raw) setSession(JSON.parse(raw) as UserSession);
      } catch {
        // offline / first launch
      } finally {
        setBootstrapped(true);
      }
    })();
  }, []);

  const persist = useCallback(async (next: UserSession | null, token?: string | null) => {
    setSession(next);
    if (next) await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(next));
    else await AsyncStorage.removeItem(AUTH_KEY);
    if (token !== undefined) await setToken(token);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await apiLogin(email, password);
      if (res) {
        await persist(res.user, res.token);
        return;
      }
      // Offline / API unavailable — demo session for scaffold
      await persist({ ...MOCK_SESSION, email }, "demo-token");
    },
    [persist]
  );

  const signUp = useCallback(
    async (input: { name: string; email: string; password: string; companyName: string }) => {
      const res = await apiRegister(input);
      if (res) {
        await persist(res.user, res.token);
        return;
      }
      await persist(
        {
          ...MOCK_SESSION,
          id: "user_new",
          email: input.email,
          name: input.name,
          companyName: input.companyName,
          role: "OWNER",
        },
        "demo-token"
      );
    },
    [persist]
  );

  const signInDemo = useCallback(async () => {
    await persist(MOCK_SESSION, "demo-token");
  }, [persist]);

  const signOut = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    await persist(null, null);
  }, [persist]);

  const value = useMemo(
    () => ({ session, bootstrapped, signIn, signUp, signOut, signInDemo }),
    [session, bootstrapped, signIn, signUp, signOut, signInDemo]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
