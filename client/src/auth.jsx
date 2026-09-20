import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const AUTH_KEY = "caloriesnap_user_v1";

const AuthContext = createContext(null);

/**
 * Lightweight local-only auth. The app is fully usable without logging in,
 * but a signed-in user gets a personalised greeting and their own goal.
 *
 * NOTE: this stores the user in localStorage only — no password is ever sent
 * anywhere. It's a demo-grade gate, not real security.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  }, [user]);

  const login = useCallback((name, email) => {
    const cleanName = (name || email?.split("@")[0] || "Friend").trim();
    setUser({ name: cleanName, email: email || "" });
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const value = useMemo(() => ({ user, login, logout, isLoggedIn: Boolean(user) }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return ctx;
}
