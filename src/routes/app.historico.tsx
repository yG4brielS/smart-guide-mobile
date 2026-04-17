import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Inbox } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatWeekRange, stressLabel, type StressLevel } from "@/lib/wellbeing";

export const Route = createFileRoute("/app/historico")({
  component: () => (
    <AuthGate allow={["atleta"]}>
      <HistoryPage />
    </AuthGate>
  ),
});

interface Row {
  id: string;
  year: number;
  week: number;
  stress_index: number;
  stress_level: StressLevel;
  tension: number;
  depression: number;
  anger: number;
  vigor: number;
  fatigue: number;
  confusion: number;
  sleep_quality: number;
  performance: number;
  created_at: string;
}

function HistoryPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("questionnaire_responses")
        .select("*")
        .eq("user_id", user.id)
        .order("year", { ascending: true })
        .order("week", { ascending: true });
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const chartData = rows.map((r) => ({
    label: `S${r.week}`,
    estresse: r.stress_index,
    vigor: r.vigor,
  }));

  return (
    <AppShell title="Histórico">
      {loading ? (
        <div className="ios-card h-48 animate-pulse" />
      ) : rows.length === 0 ? (
        <div className="ios-card p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-muted text-muted-foreground grid place-items-center mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="font-semibold">Sem respostas ainda</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Responda o questionário desta semana para começar.
          </p>
        </div>
      ) : (
        <>
          <div className="ios-card p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Evolução
            </p>
            <h3 className="font-semibold mb-3">Estresse vs Vigor</h3>
            <div className="h-56 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} domain={[0, 10]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Line type="monotone" dataKey="estresse" stroke="var(--color-destructive)" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="vigor" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-destructive" />
                <span className="text-muted-foreground">Estresse</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-muted-foreground">Vigor</span>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground px-1">
              Respostas
            </p>
            {[...rows].reverse().map((r) => (
              <ResponseRow key={r.id} row={r} />
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}

function ResponseRow({ row }: { row: Row }) {
  const tone =
    row.stress_level === "baixo"
      ? "bg-success/15 text-success"
      : row.stress_level === "moderado"
      ? "bg-warning/15 text-warning"
      : "bg-destructive/15 text-destructive";
  return (
    <div className="ios-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">Semana {row.week}</p>
          <p className="text-xs text-muted-foreground">{formatWeekRange(row.year, row.week)}</p>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${tone}`}>
          {row.stress_index}/10 · {stressLabel(row.stress_level)}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <Mini label="Vigor" value={row.vigor} max={10} />
        <Mini label="Sono" value={row.sleep_quality} max={4} />
        <Mini label="Desemp." value={row.performance} max={4} />
      </div>
    </div>
  );
}

function Mini({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="rounded-xl bg-muted py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-sm">
        {value}<span className="text-muted-foreground">/{max}</span>
      </p>
    </div>
  );
}
