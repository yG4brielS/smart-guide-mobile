import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "atleta" | "psicologo" | "treinador";

export interface Profile {
  id: string;
  user_id: string;
  code: string;
  full_name: string;
  must_change_password: boolean;
  avatar_url: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadExtras = useCallback(async (uid: string) => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
    ]);
    setProfile((p as Profile | null) ?? null);
    setRole(((r?.role as AppRole) ?? null));
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    setUser(data.session?.user ?? null);
    if (data.session?.user) await loadExtras(data.session.user.id);
    else {
      setProfile(null);
      setRole(null);
    }
  }, [loadExtras]);

  useEffect(() => {
    // 1. listener primeiro
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // defer chamadas ao supabase para evitar deadlock
        setTimeout(() => loadExtras(newSession.user.id), 0);
      } else {
        setProfile(null);
        setRole(null);
      }
    });

    // 2. depois pega sessão atual
    refresh().finally(() => setLoading(false));

    return () => sub.subscription.unsubscribe();
  }, [refresh, loadExtras]);

  return (
    <AuthContext.Provider value={{ session, user, profile, role, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
