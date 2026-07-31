import { createContext, useContext, useEffect, useState } from "react";
import { authApi, clearTokens, isLoggedIn, setTokens } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isLoggedIn());

  useEffect(() => {
    if (!isLoggedIn()) {
      setLoading(false);
      return;
    }
    authApi
      .profile()
      .then(setUser)
      .catch(() => {
        clearTokens();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await authApi.login({ email, password });
    setTokens(data.access, data.refresh);
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    const data = await authApi.register(payload);
    setTokens(data.access, data.refresh);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    const refresh = localStorage.getItem("refresh");
    try {
      if (refresh) await authApi.logout(refresh);
    } catch {
      /* ignore */
    }
    clearTokens();
    setUser(null);
  }

  async function refreshProfile() {
    const profile = await authApi.profile();
    setUser(profile);
    return profile;
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshProfile, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
