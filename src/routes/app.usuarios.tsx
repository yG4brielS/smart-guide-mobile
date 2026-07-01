import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, UserPlus, CheckCircle2, Clock } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import { createAthleteUser } from "@/lib/users.functions";

export const Route = createFileRoute("/app/usuarios")({
  component: () => (
    <AuthGate allow={["moderador"]}>
      <UsersPage />
    </AuthGate>
  ),
});

interface CodeRow {
  code: string;
  full_name: string;
  used: boolean;
  created_at: string;
}

function UsersPage() {
  const create = useServerFn(createAthleteUser);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [list, setList] = useState<CodeRow[]>([]);

  async function reload() {
    const { data } = await supabase
      .from("allowed_codes")
      .select("code,full_name,used,created_at")
      .eq("role", "atleta")
      .order("created_at", { ascending: false })
      .limit(30);
    setList((data as CodeRow[]) ?? []);
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await create({ data: { code: code.trim(), full_name: name.trim() } });
      setSuccess(`Atleta cadastrado. Senha inicial: ${res.code}`);
      setCode("");
      setName("");
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Adicionar atleta">
      <form onSubmit={handleSubmit} className="ios-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary-soft text-primary grid place-items-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <p className="text-sm text-muted-foreground">
            O código será também a senha inicial do aluno.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 px-1">
            Código do aluno
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoCapitalize="characters"
            placeholder="Ex: 2024001"
            className="w-full h-12 px-4 rounded-2xl bg-background border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 px-1">
            Nome completo
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do atleta"
            className="w-full h-12 px-4 rounded-2xl bg-background border border-border text-base focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3 border border-destructive/20">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl bg-success/15 text-success text-sm px-4 py-3 border border-success/20">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="ios-pressable w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          Cadastrar atleta
        </button>
      </form>

      <h2 className="text-sm font-semibold text-muted-foreground mt-6 mb-2 px-1">
        Últimos cadastros
      </h2>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1">Nenhum atleta cadastrado ainda.</p>
      ) : (
        <div className="space-y-2">
          {list.map((c) => (
            <div key={c.code} className="ios-card p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{c.full_name}</p>
                <p className="text-xs text-muted-foreground">{c.code}</p>
              </div>
              {c.used ? (
                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-success/15 text-success font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Já acessou
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-semibold">
                  <Clock className="w-3.5 h-3.5" /> Pendente
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
