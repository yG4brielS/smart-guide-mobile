import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    navigate({ to: user ? "/app" : "/login" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen grid place-items-center bg-background text-foreground">
      <Loader2 className="w-7 h-7 animate-spin text-primary" />
    </div>
  );
}
