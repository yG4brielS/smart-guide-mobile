import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Activity, Loader2, Eye, EyeOff } from "lucide-react";
import { signInWithCode } from "@/lib/auth-helpers";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Entrar — Bem-Estar" },
      { name: "description", content: "Acesse o sistema com seu código de aluno." },
    ],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [loading, user, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim() || !password) {
      setError("Preencha código e senha.");
      return;
    }
    setSubmitting(true);
    try {
      await signInWithCode(code, password);
      navigate({ to: "/app" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao entrar.";
      // mensagens amigáveis
      if (msg.toLowerCase().includes("invalid login")) {
        setError("Código ou senha incorretos.");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="mx-auto w-16 h-16 rounded-3xl bg-primary text-primary-foreground grid place-items-center shadow-soft mb-4">
              <Activity className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Bem-Estar</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitoramento de atletas universitários
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 px-1">
                Código do aluno
              </label>
              <input
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="username"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex: 2024001"
                className="w-full h-12 px-4 rounded-2xl bg-card border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 px-1">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="No primeiro acesso, use seu código"
                  className="w-full h-12 px-4 pr-12 rounded-2xl bg-card border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                >
                  {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3 border border-destructive/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="ios-pressable w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-soft disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
              Entrar
            </button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-8 px-4 leading-relaxed">
            Apenas alunos com código autorizado podem acessar.
            No primeiro acesso, sua senha é igual ao seu código.
          </p>
        </div>
      </div>
    </div>
  );
}
