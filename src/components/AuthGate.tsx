import { useEffect, type ReactNode } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  allow?: AppRole[];
}

export function AuthGate({ children, allow }: Props) {
  const { loading, user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (profile?.must_change_password && location.pathname !== "/app/alterar-senha") {
      navigate({ to: "/app/alterar-senha" });
    }
  }, [loading, user, profile, navigate, location.pathname]);

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  // role check
  if (allow) {
    // role vem junto com profile via useAuth; pega via consumer abaixo
    return <RoleCheck allow={allow}>{children}</RoleCheck>;
  }

  return <>{children}</>;
}

function RoleCheck({ children, allow }: { children: ReactNode; allow: AppRole[] }) {
  const { role } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (role && !allow.includes(role)) navigate({ to: "/app" });
  }, [role, allow, navigate]);
  if (!role || !allow.includes(role)) return null;
  return <>{children}</>;
}
