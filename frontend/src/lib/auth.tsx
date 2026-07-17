import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "./api";

export type Role = "manager" | "employee" | null;

interface AuthState {
  user: any;
  session: any;
  role: Role;
  employeeId: string | null;
  fullName: string;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthState>({
  user: null, session: null, role: null, employeeId: null, fullName: "", loading: true, 
  refresh: async () => {}, logout: () => {}
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<Role>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) throw new Error("No token");
      
      const { user: u } = await apiFetch('/auth/me');
      setSession({ token });
      setUser(u);
      
      const r = u.role.toLowerCase() as Role;
      setRole(r);
      setEmployeeId(u.employee?.id ?? null);
      setFullName(u.employee?.name || u.email || "");
    } catch (e) {
      setSession(null);
      setUser(null);
      setRole(null);
      setEmployeeId(null);
      setFullName("");
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await load();
  };
  
  const logout = () => {
    sessionStorage.removeItem('token');
    refresh();
  };

  useEffect(() => {
    load();
  }, []);

  return <Ctx.Provider value={{ user, session, role, employeeId, fullName, loading, refresh, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
