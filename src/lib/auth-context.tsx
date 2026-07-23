import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";

export type Role = "manager" | "employee";
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  initials: string;
};

type AuthCtx = {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signUp: (email: string, password: string, name: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

async function fetchProfile(userId: string, fallbackEmail: string): Promise<AuthUser> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", userId)
    .maybeSingle();
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  const name = profile?.full_name ?? fallbackEmail.split("@")[0];
  const role = (roleRow?.role as Role) ?? "employee";
  return {
    id: userId,
    email: profile?.email ?? fallbackEmail,
    name,
    role,
    initials: initials(name),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        try {
          const profile = await fetchProfile(data.session.user.id, data.session.user.email ?? "");
          setUser(profile.role === "manager" ? profile : null);
        } catch (e) {
          console.error(e);
        }
      }
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, session) => {
      if (session?.user) {
        try {
          const profile = await fetchProfile(session.user.id, session.user.email ?? "");
          setUser(profile.role === "manager" ? profile : null);
        } catch (e) {
          console.error(e);
        }
      } else {
        setUser(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const u = await fetchProfile(data.user.id, data.user.email ?? email);
      if (u.role !== "manager") {
        await supabase.auth.signOut();
        throw new Error("Only managers can sign in to the admin system.");
      }
      setUser(u);
      return u;
    }
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  };

  const signUp: AuthCtx["signUp"] = async (email, password, name) => {
    const role: Role = "manager";
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, role }, emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Check your email to confirm your account.");
      // The auth trigger in db/schema.sql writes user_roles with security definer privileges.
      // Browser-side role writes are intentionally blocked by RLS.
      await supabase.from("profiles").upsert({ id: data.user.id, full_name: name, email });
      const u: AuthUser = { id: data.user.id, email, name, role, initials: initials(name) };
      setUser(u);
      return u;
    }
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  };

  const signOut: AuthCtx["signOut"] = async () => {
    if (isSupabaseConfigured && supabase) await supabase.auth.signOut();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, signIn, signUp, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
