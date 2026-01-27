import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "../api/client";

export type User = {
  id: string;
  email: string;
  firstname?: string | null;
  lastName?: string | null;
  role: "ADMIN" | "BASIC";
  isActive: boolean;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // check current user on load
  useEffect(() => {
    const init = async () => {
      try {
        const me = await apiFetch<User>("/users/me");
        setUser(me);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const login = async (email: string, password: string) => {
    const u = await apiFetch<User>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    setUser(u);
  };

  const logout = async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
