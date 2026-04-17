import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, Search, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import { stressLabel, type StressLevel } from "@/lib/wellbeing";

export const Route = createFileRoute("/app/atletas/")({
  component: () => (
    <AuthGate allow={["psicologo", "treinador"]}>
      <AthletesPage />
    </AuthGate>
  ),
});

interface AthleteRow {
  user_id: string;
  full_name: string;
  code: string;
  last_index: number | null;
  last_level: StressLevel | null;
}

function AthletesPage() {
  const [items, setItems] = useState<AthleteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      // pega só atletas
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "atleta");
      const ids = (roleRows ?? []).map((r) => r.user_id);
      if (ids.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id,full_name,code")
        .in("user_id", ids);

      const { data: resps } = await supabase
        .from("questionnaire_responses")
        .select("user_id,stress_index,stress_level,created_at")
        .in("user_id", ids)
        .order("created_at", { ascending: false });

      const lastByUser = new Map<string, { idx: number; lvl: StressLevel }>();
      (resps ?? []).forEach((r) => {
        if (!lastByUser.has(r.user_id)) {
          lastByUser.set(r.user_id, { idx: r.stress_index, lvl: r.stress_level as StressLevel });
        }
      });

      const rows: AthleteRow[] = (profs ?? []).map((p) => {
        const last = lastByUser.get(p.user_id);
        return {
          user_id: p.user_id,
          full_name: p.full_name,
          code: p.code,
          last_index: last?.idx ?? null,
          last_level: last?.lvl ?? null,
        };
      });
      rows.sort((a, b) => (b.last_index ?? -1) - (a.last_index ?? -1));
      setItems(rows);
      setLoading(false);
    })();
  }, []);

  const filtered = items.filter(
    (a) =>
      a.full_name.toLowerCase().includes(q.toLowerCase()) ||
      a.code.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <AppShell title="Atletas">
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou código"
          className="w-full h-11 pl-10 pr-4 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="ios-card h-16 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="ios-card p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-muted text-muted-foreground grid place-items-center mb-3">
            <Users className="w-6 h-6" />
          </div>
          <p className="text-sm text-muted-foreground">Nenhum atleta encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <Link
              key={a.user_id}
              to="/app/atletas/$id"
              params={{ id: a.user_id }}
              className="ios-pressable ios-card p-4 flex items-center gap-3"
            >
              <div className="w-11 h-11 rounded-2xl bg-primary-soft text-primary grid place-items-center font-semibold">
                {a.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{a.full_name}</p>
                <p className="text-xs text-muted-foreground">{a.code}</p>
              </div>
              {a.last_level ? (
                <Pill level={a.last_level} value={a.last_index!} />
              ) : (
                <span className="text-xs text-muted-foreground">Sem dados</span>
              )}
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function Pill({ level, value }: { level: StressLevel; value: number }) {
  const tone =
    level === "baixo"
      ? "bg-success/15 text-success"
      : level === "moderado"
      ? "bg-warning/15 text-warning"
      : "bg-destructive/15 text-destructive";
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${tone}`}>
      {value} · {stressLabel(level)}
    </span>
  );
}
