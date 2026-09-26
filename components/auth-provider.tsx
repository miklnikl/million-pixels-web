"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@/app/types";
import { AuthFormModal } from "@/components/auth-form-modal";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  openAuth: (mode?: "login" | "register") => void;
  logout: () => Promise<void>;
  sessionExpired: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register" | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.ok) {
          const currentUser: User = await response.json();
          if (!controller.signal.aborted) setUser(currentUser);
        } else if (response.status !== 401) {
          throw new Error(
            "Unable to check your session. Please sign in again.",
          );
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("Unable to check your session. Please sign in again.");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void loadSession();
    return () => controller.abort();
  }, []);

  async function logout() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error();
      setUser(null);
    } catch {
      setError("Unable to sign out. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        openAuth: (nextMode = "login") => {
          setError(null);
          setMode(nextMode);
        },
        logout,
        sessionExpired: () => {
          setUser(null);
          setMode("login");
        },
      }}
    >
      {children}
      {mode && (
        <AuthFormModal
          key={mode}
          mode={mode}
          onModeChange={setMode}
          onClose={() => setMode(null)}
          onAuthenticated={(currentUser) => {
            setUser(currentUser);
            setError(null);
            setMode(null);
          }}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
