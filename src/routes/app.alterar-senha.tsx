import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, Lock } from "lucide-react";
import { changePassword } from "@/lib/auth-helpers";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/alterar-senha")({
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const navigate = useNavigate();
  const { profile, refresh } = useAuth();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const forced = profile?.must_change_password === true;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (pwd.length < 6) return setError("A senha deve ter ao menos 6 caracteres.");
    if (pwd !== confirm) return setError("As senhas não coincidem.");
    setLoading(true);
    try {
      await changePassword(pwd);
      await refresh();
      navigate({ to: "/app" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary-soft text-primary grid place-items-center mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold">
            {forced ? "Crie uma nova senha" : "Alterar senha"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {forced
              ? "Por segurança, defina uma senha pessoal para continuar."
              : "Escolha uma nova senha para sua conta."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 px-1">
              Nova senha
            </label>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              autoComplete="new-password"
              className="w-full h-12 px-4 rounded-2xl bg-card border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 px-1">
              Confirmar senha
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="w-full h-12 px-4 rounded-2xl bg-card border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3 border border-destructive/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="ios-pressable w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            Salvar nova senha
          </button>

          {!forced && (
            <button
              type="button"
              onClick={() => navigate({ to: "/app/configuracoes" })}
              className="w-full h-11 text-sm text-muted-foreground"
            >
              Cancelar
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
