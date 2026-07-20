import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "./api";

// Only managers can log in now — no employee role in the system
export type Role = "manager" | null;

interface AuthState {
  user: any;
  role: Role;
  fullName: string;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthState>({
  user: null, role: null, fullName: "", loading: true,
  refresh: async () => {}, logout: () => {}
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<Role>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const token = sessionStorage.getItem("token");
      if (!token) throw new Error("No token");
      const { user: u } = await apiFetch("/auth/me");
      setUser(u);
      setRole("manager"); // only managers can log in
      setFullName(u.email?.split("@")[0] || "Manager");
    } catch {
      setUser(null);
      setRole(null);
      setFullName("");
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => { await load(); };

  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    refresh();
  };

  useEffect(() => { load(); }, []);

  return (
    <Ctx.Provider value={{ user, role, fullName, loading, refresh, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
