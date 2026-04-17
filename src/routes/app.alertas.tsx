import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, ChevronRight, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import { stressLabel, type StressLevel } from "@/lib/wellbeing";

export const Route = createFileRoute("/app/alertas")({
  component: () => (
    <AuthGate allow={["treinador"]}>
      <AlertsPage />
    </AuthGate>
  ),
});

interface Item {
  user_id: string;
  full_name: string;
  code: string;
  last_index: number;
  last_level: StressLevel;
}

function AlertsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [avg, setAvg] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "atleta");
      const ids = (roleRows ?? []).map((r) => r.user_id);

      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id,full_name,code")
        .in("user_id", ids);

      const { data: resps } = await supabase
        .from("questionnaire_responses")
        .select("user_id,stress_index,stress_level,created_at")
        .in("user_id", ids)
        .order("created_at", { ascending: false });

      const last = new Map<string, { idx: number; lvl: StressLevel }>();
      (resps ?? []).forEach((r) => {
        if (!last.has(r.user_id))
          last.set(r.user_id, { idx: r.stress_index, lvl: r.stress_level as StressLevel });
      });

      const rows: Item[] = [];
      let sum = 0;
      let n = 0;
      (profs ?? []).forEach((p) => {
        const l = last.get(p.user_id);
        if (l) {
          sum += l.idx;
          n++;
          if (l.lvl !== "baixo") {
            rows.push({
              user_id: p.user_id,
              full_name: p.full_name,
              code: p.code,
              last_index: l.idx,
              last_level: l.lvl,
            });
          }
        }
      });
      rows.sort((a, b) => b.last_index - a.last_index);
      setItems(rows);
      setAvg(n === 0 ? null : Number((sum / n).toFixed(1)));
      setLoading(false);
    })();
  }, []);

  return (
    <AppShell title="Alertas">
      {/* Resumo */}
      <div className="ios-card p-5 mb-4 bg-primary text-primary-foreground border-transparent">
        <p className="text-xs uppercase tracking-wider opacity-80">Média da equipe</p>
        <div className="flex items-end justify-between mt-1">
          <p className="text-4xl font-bold leading-none">
            {avg ?? "—"}
            <span className="text-base font-normal opacity-80">/10</span>
          </p>
          <ShieldCheck className="w-8 h-8 opacity-70" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="ios-card h-16 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="ios-card p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-success/15 text-success grid place-items-center mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <p className="font-semibold">Equipe tranquila</p>
          <p className="text-sm text-muted-foreground mt-1">
            Nenhum atleta com estresse moderado ou alto no momento.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-2 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Atletas em atenção
          </p>
          <div className="space-y-2">
            {items.map((it) => (
              <Link
                key={it.user_id}
                to="/app/atletas/$id"
                params={{ id: it.user_id }}
                className="ios-pressable ios-card p-4 flex items-center gap-3"
              >
                <div className="w-11 h-11 rounded-2xl bg-primary-soft text-primary grid place-items-center font-semibold">
                  {it.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{it.full_name}</p>
                  <p className="text-xs text-muted-foreground">{it.code}</p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    it.last_level === "alto"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-warning/15 text-warning"
                  }`}
                >
                  {it.last_index} · {stressLabel(it.last_level)}
                </span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
