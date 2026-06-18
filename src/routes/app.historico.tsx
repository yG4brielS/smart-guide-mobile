import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Inbox, CalendarOff } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatWeekRange, isoYearWeek, stressLabel, type StressLevel } from "@/lib/wellbeing";

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

interface WeekSlot {
  year: number;
  week: number;
  response: Row | null;
}

// Itera semanas ISO de (startYear,startWeek) até (endYear,endWeek) inclusive.
// Caminha do fim para o início somando -7 dias em UTC e reconverte via isoYearWeek.
// Limita a janela a no máximo MAX_WEEKS semanas para evitar listas gigantes.
const MAX_WEEKS = 26;

function buildWeekRange(
  startYear: number,
  startWeek: number,
  endYear: number,
  endWeek: number
): { year: number; week: number }[] {
  const out: { year: number; week: number }[] = [];
  const cursor = mondayOfIsoWeek(endYear, endWeek);
  for (let i = 0; i < MAX_WEEKS; i++) {
    const yw = isoYearWeek(cursor);
    out.unshift({ year: yw.year, week: yw.week });
    if (yw.year === startYear && yw.week === startWeek) break;
    cursor.setUTCDate(cursor.getUTCDate() - 7);
    const next = isoYearWeek(cursor);
    if (next.year < startYear || (next.year === startYear && next.week < startWeek)) break;
  }
  return out;
}

function mondayOfIsoWeek(year: number, week: number): Date {
  // 4 de janeiro está sempre na semana 1 ISO.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // 1..7
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return monday;
}

function HistoryPage() {
  const { user, profile } = useAuth();
  const [slots, setSlots] = useState<WeekSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile) return;
    (async () => {
      const { data } = await supabase
        .from("questionnaire_responses")
        .select("*")
        .eq("user_id", user.id)
        .order("year", { ascending: true })
        .order("week", { ascending: true });
      const responses = (data as Row[]) ?? [];

      const end = isoYearWeek();
      const first = responses[0];
      const start = first
        ? { year: first.year, week: first.week }
        : end;
      const weeks = buildWeekRange(start.year, start.week, end.year, end.week);

      const map = new Map<string, Row>();
      responses.forEach((r) => map.set(`${r.year}-${r.week}`, r));

      setSlots(
        weeks.map((w) => ({
          year: w.year,
          week: w.week,
          response: map.get(`${w.year}-${w.week}`) ?? null,
        }))
      );
      setLoading(false);
    })();
  }, [user, profile]);

  const answered = slots.filter((s) => s.response).length;
  const total = slots.length;
  const adesao = total > 0 ? Math.round((answered / total) * 100) : 0;

  const answeredSlots = slots.filter((s) => s.response);
  const yearsInChart = new Set(answeredSlots.map((s) => s.year));
  const showYear = yearsInChart.size > 1;
  const chartData = answeredSlots.map((s) => ({
    label: showYear ? `S${s.week}/${String(s.year).slice(-2)}` : `S${s.week}`,
    estresse: s.response!.stress_index,
    vigor: s.response!.vigor,
  }));

  return (
    <AppShell title="Histórico">
      {loading ? (
        <div className="ios-card h-48 animate-pulse" />
      ) : total === 0 ? (
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
          {/* Adesão */}
          <div className="ios-card p-4 mb-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Taxa de adesão</p>
            <div className="flex items-end justify-between mt-1">
              <p className="text-3xl font-bold">
                {adesao}
                <span className="text-base font-normal text-muted-foreground">%</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {answered} de {total} {total === 1 ? "semana" : "semanas"}
              </p>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${adesao}%` }}
              />
            </div>
          </div>

          {answered > 0 && (
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
          )}

          <div className="mt-5 space-y-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground px-1">
              Semanas
            </p>
            {[...slots].reverse().map((s) =>
              s.response ? (
                <ResponseRow key={`${s.year}-${s.week}`} row={s.response} />
              ) : (
                <MissingRow key={`${s.year}-${s.week}`} year={s.year} week={s.week} />
              )
            )}
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

function MissingRow({ year, week }: { year: number; week: number }) {
  return (
    <div className="ios-card p-4 opacity-80 border-dashed">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-muted text-muted-foreground grid place-items-center">
            <CalendarOff className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold">Semana {week}</p>
            <p className="text-xs text-muted-foreground">{formatWeekRange(year, week)}</p>
          </div>
        </div>
        <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
          Não respondido
        </span>
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
