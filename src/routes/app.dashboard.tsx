import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Users,
  AlertTriangle,
  Activity,
  ChevronRight,
  Loader2,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import { stressLabel, type StressLevel } from "@/lib/wellbeing";

export const Route = createFileRoute("/app/dashboard")({
  component: () => (
    <AuthGate allow={["psicologo", "treinador"]}>
      <DashboardPage />
    </AuthGate>
  ),
});

interface RespRow {
  id: string;
  user_id: string;
  year: number;
  week: number;
  stress_index: number;
  stress_level: StressLevel;
  vigor: number;
  fatigue: number;
  tension: number;
  depression: number;
  anger: number;
  confusion: number;
  sleep_quality: number;
  performance: number;
  created_at: string;
}

interface ProfileRow {
  user_id: string;
  full_name: string;
  code: string;
}

function DashboardPage() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [responses, setResponses] = useState<RespRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "atleta");
      const ids = (roleRows ?? []).map((r) => r.user_id);
      if (ids.length === 0) {
        setLoading(false);
        return;
      }
      const [{ data: profs }, { data: resps }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id,full_name,code")
          .in("user_id", ids),
        supabase
          .from("questionnaire_responses")
          .select(
            "id,user_id,year,week,stress_index,stress_level,vigor,fatigue,tension,depression,anger,confusion,sleep_quality,performance,created_at"
          )
          .in("user_id", ids)
          .order("created_at", { ascending: true }),
      ]);
      setProfiles((profs as ProfileRow[]) ?? []);
      setResponses((resps as RespRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const totalAtletas = profiles.length;
    const lastByUser = new Map<string, RespRow>();
    responses.forEach((r) => lastByUser.set(r.user_id, r));
    const latest = Array.from(lastByUser.values());

    const dist = { baixo: 0, moderado: 0, alto: 0 };
    let sumIdx = 0;
    let sumVigor = 0;
    let sumFadiga = 0;
    let sumSono = 0;
    latest.forEach((r) => {
      dist[r.stress_level]++;
      sumIdx += r.stress_index;
      sumVigor += r.vigor;
      sumFadiga += r.fatigue;
      sumSono += r.sleep_quality;
    });
    const n = latest.length || 1;

    const semResposta = totalAtletas - latest.length;

    // série semanal: média por (year,week)
    const byWeek = new Map<string, { sumIdx: number; sumVigor: number; sumFadiga: number; n: number; year: number; week: number }>();
    responses.forEach((r) => {
      const key = `${r.year}-${String(r.week).padStart(2, "0")}`;
      const cur = byWeek.get(key) ?? { sumIdx: 0, sumVigor: 0, sumFadiga: 0, n: 0, year: r.year, week: r.week };
      cur.sumIdx += r.stress_index;
      cur.sumVigor += r.vigor;
      cur.sumFadiga += r.fatigue;
      cur.n++;
      byWeek.set(key, cur);
    });
    const weeklyEntries = Array.from(byWeek.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-8)
      .map(([, v]) => v);
    const weeklyYears = new Set(weeklyEntries.map((v) => v.year));
    const showWeeklyYear = weeklyYears.size > 1;
    const weekly = weeklyEntries.map((v) => ({
      label: showWeeklyYear ? `S${v.week}/${String(v.year).slice(-2)}` : `S${v.week}`,
      estresse: +(v.sumIdx / v.n).toFixed(1),
      vigor: +(v.sumVigor / v.n).toFixed(1),
      fadiga: +(v.sumFadiga / v.n).toFixed(1),
    }));

    // dimensões médias (última resposta de cada atleta)
    const dims = ["tension", "depression", "anger", "vigor", "fatigue", "confusion"] as const;
    const dimsLabel: Record<(typeof dims)[number], string> = {
      tension: "Tensão",
      depression: "Depressão",
      anger: "Raiva",
      vigor: "Vigor",
      fatigue: "Fadiga",
      confusion: "Confusão",
    };
    const dimensions = dims.map((d) => ({
      name: dimsLabel[d],
      valor: latest.length
        ? +(latest.reduce((acc, r) => acc + r[d], 0) / latest.length).toFixed(1)
        : 0,
    }));

    // top 5 maior estresse
    const topAtletas = latest
      .map((r) => {
        const p = profiles.find((x) => x.user_id === r.user_id);
        return {
          user_id: r.user_id,
          name: p?.full_name ?? "—",
          code: p?.code ?? "",
          idx: r.stress_index,
          level: r.stress_level,
        };
      })
      .sort((a, b) => b.idx - a.idx)
      .slice(0, 5);

    return {
      totalAtletas,
      responderam: latest.length,
      semResposta,
      mediaIdx: latest.length ? +(sumIdx / n).toFixed(1) : 0,
      mediaVigor: latest.length ? +(sumVigor / n).toFixed(1) : 0,
      mediaFadiga: latest.length ? +(sumFadiga / n).toFixed(1) : 0,
      mediaSono: latest.length ? +(sumSono / n).toFixed(1) : 0,
      dist,
      weekly,
      dimensions,
      topAtletas,
    };
  }, [profiles, responses]);

  if (loading) {
    return (
      <AppShell title="Dashboard">
        <div className="grid place-items-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  const pieData = [
    { name: "Baixo", value: stats.dist.baixo, color: "var(--color-success)" },
    { name: "Moderado", value: stats.dist.moderado, color: "var(--color-warning)" },
    { name: "Alto", value: stats.dist.alto, color: "var(--color-destructive)" },
  ];

  return (
    <AppShell title="Dashboard">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <KPI icon={Users} label="Atletas" value={stats.totalAtletas} tone="primary" />
        <KPI icon={Activity} label="Responderam" value={stats.responderam} tone="success" />
        <KPI icon={TrendingUp} label="Estresse médio" value={`${stats.mediaIdx}/10`} tone="warning" />
        <KPI icon={AlertTriangle} label="Estresse alto" value={stats.dist.alto} tone="destructive" />
      </div>

      {/* Distribuição */}
      <Section title="Distribuição de estresse" icon={BarChart3}>
        {stats.responderam === 0 ? (
          <Empty>Sem respostas registradas ainda.</Empty>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* Evolução semanal */}
      <Section title="Evolução semanal (média)" icon={TrendingUp}>
        {stats.weekly.length === 0 ? (
          <Empty>Sem histórico suficiente.</Empty>
        ) : (
          <div className="h-56 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.weekly}>
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
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="estresse" stroke="var(--color-destructive)" strokeWidth={2.5} />
                <Line type="monotone" dataKey="vigor" stroke="var(--color-primary)" strokeWidth={2.5} />
                <Line type="monotone" dataKey="fadiga" stroke="var(--color-warning)" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* Dimensões médias */}
      <Section title="Dimensões médias (última resposta)" icon={BarChart3}>
        {stats.responderam === 0 ? (
          <Empty>Sem respostas.</Empty>
        ) : (
          <div className="h-56 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dimensions}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} domain={[0, 10]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="valor" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* Top atletas */}
      <Section title="Atletas com maior estresse" icon={AlertTriangle}>
        {stats.topAtletas.length === 0 ? (
          <Empty>Sem dados.</Empty>
        ) : (
          <div className="space-y-2">
            {stats.topAtletas.map((a) => {
              const tone =
                a.level === "baixo"
                  ? "bg-success/15 text-success"
                  : a.level === "moderado"
                  ? "bg-warning/15 text-warning"
                  : "bg-destructive/15 text-destructive";
              return (
                <Link
                  key={a.user_id}
                  to="/app/atletas/$id"
                  params={{ id: a.user_id }}
                  className="ios-pressable ios-card p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-2xl bg-primary-soft text-primary grid place-items-center font-semibold">
                    {a.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.code}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${tone}`}>
                    {a.idx} · {stressLabel(a.level)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        )}
      </Section>

      {stats.semResposta > 0 && (
        <p className="text-xs text-muted-foreground text-center mt-4">
          {stats.semResposta} atleta(s) ainda sem resposta registrada.
        </p>
      )}
    </AppShell>
  );
}

function KPI({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  tone: "primary" | "success" | "warning" | "destructive";
}) {
  const toneCls = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/15 text-destructive",
  }[tone];
  return (
    <div className="ios-card p-4">
      <div className={`w-9 h-9 rounded-2xl grid place-items-center mb-2 ${toneCls}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Users;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      </div>
      <div className="ios-card p-4">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground text-center py-3">{children}</p>;
}
