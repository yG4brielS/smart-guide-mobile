import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ClipboardList,
  History as HistoryIcon,
  TrendingUp,
  Users,
  AlertCircle,
  Sparkles,
  CalendarCheck,
  UserX,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { isoYearWeek, stressLabel, type StressLevel } from "@/lib/wellbeing";

export const Route = createFileRoute("/app/")({
  component: HomePage,
});

interface LastResponse {
  stress_index: number;
  stress_level: StressLevel;
  year: number;
  week: number;
  created_at: string;
}

interface WeekSummary {
  total: number;
  responderam: number;
  mediaIdx: number | null;
  alertos: number;
  semResposta: { user_id: string; full_name: string; code: string }[];
}

function HomePage() {
  const { profile, role } = useAuth();
  const [last, setLast] = useState<LastResponse | null>(null);
  const [respondedThisWeek, setRespondedThisWeek] = useState(false);
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      if (role === "atleta") {
        const { data } = await supabase
          .from("questionnaire_responses")
          .select("stress_index,stress_level,year,week,created_at")
          .order("created_at", { ascending: false })
          .limit(1);
        const rows = data as LastResponse[] | null;
        const l = rows?.[0] ?? null;
        setLast(l);
        const cur = isoYearWeek();
        setRespondedThisWeek(!!l && l.year === cur.year && l.week === cur.week);
      } else {
        const cur = isoYearWeek();
        const { data: roleRows } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "atleta");
        const ids = (roleRows ?? []).map((r) => r.user_id);

        const [{ data: profs }, { data: weekResps }] = await Promise.all([
          supabase
            .from("profiles")
            .select("user_id,full_name,code")
            .in("user_id", ids),
          supabase
            .from("questionnaire_responses")
            .select("user_id,stress_index,stress_level")
            .in("user_id", ids)
            .eq("year", cur.year)
            .eq("week", cur.week),
        ]);

        const respIds = new Set((weekResps ?? []).map((r) => r.user_id));
        const semResposta = (profs ?? [])
          .filter((p) => !respIds.has(p.user_id))
          .map((p) => ({ user_id: p.user_id, full_name: p.full_name, code: p.code }));

        const sum = (weekResps ?? []).reduce((acc, r) => acc + r.stress_index, 0);
        const alertos = (weekResps ?? []).filter((r) => r.stress_level === "alto").length;

        setSummary({
          total: ids.length,
          responderam: respIds.size,
          mediaIdx: respIds.size ? +(sum / respIds.size).toFixed(1) : null,
          alertos,
          semResposta,
        });
      }
      setLoaded(true);
    })();
  }, [role]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  return (
    <AppShell title="Início">
      <div className="space-y-5">
        <div>
          <p className="text-sm text-muted-foreground">{greeting},</p>
          <h2 className="text-2xl font-bold tracking-tight">
            {profile?.full_name.split(" ")[0]} 👋
          </h2>
        </div>

        {role === "atleta" && (
          <>
            <StressCard last={last} loaded={loaded} respondedThisWeek={respondedThisWeek} />
            <Link to="/app/questionario" className="ios-pressable block ios-card p-5">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground grid place-items-center shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">
                    {respondedThisWeek ? "Questionário desta semana ✓" : "Responder questionário semanal"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {respondedThisWeek
                      ? "Você já respondeu. Volte na próxima semana."
                      : "Leva menos de 2 minutos."}
                  </p>
                </div>
              </div>
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <ShortcutCard to="/app/historico" icon={HistoryIcon} label="Histórico" />
              <ShortcutCard to="/app/configuracoes" icon={Sparkles} label="Perfil" />
            </div>
          </>
        )}

        {(role === "psicologo" || role === "treinador") && (
          <>
            {!loaded || !summary ? (
              <div className="ios-card h-44 animate-pulse" />
            ) : (
              <WeeklySummaryCard summary={summary} />
            )}

            {summary && summary.semResposta.length > 0 && (
              <div className="ios-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-muted text-muted-foreground grid place-items-center">
                    <UserX className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Ainda não responderam</p>
                    <p className="text-xs text-muted-foreground">
                      {summary.semResposta.length} de {summary.total} atletas
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {summary.semResposta.slice(0, 8).map((a) => (
                    <Link
                      key={a.user_id}
                      to="/app/atletas/$id"
                      params={{ id: a.user_id }}
                      className="ios-pressable flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50"
                    >
                      <div className="w-7 h-7 rounded-xl bg-primary-soft text-primary grid place-items-center text-xs font-semibold">
                        {a.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.full_name}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{a.code}</span>
                    </Link>
                  ))}
                  {summary.semResposta.length > 8 && (
                    <Link
                      to="/app/atletas"
                      className="block text-center text-xs text-primary font-medium pt-2"
                    >
                      Ver todos ({summary.semResposta.length})
                    </Link>
                  )}
                </div>
              </div>
            )}

            <Link to="/app/atletas" className="ios-pressable block ios-card p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground grid place-items-center">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Ver atletas</p>
                  <p className="text-sm text-muted-foreground">Estado atual e histórico individual</p>
                </div>
              </div>
            </Link>
            {role === "treinador" && (
              <Link to="/app/alertas" className="ios-pressable block ios-card p-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-warning/15 text-warning grid place-items-center">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Alertas da equipe</p>
                    <p className="text-sm text-muted-foreground">Atletas com estresse elevado</p>
                  </div>
                </div>
              </Link>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function WeeklySummaryCard({ summary }: { summary: WeekSummary }) {
  const cur = isoYearWeek();
  const pct = summary.total ? Math.round((summary.responderam / summary.total) * 100) : 0;
  return (
    <div className="ios-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-primary-soft text-primary grid place-items-center">
          <CalendarCheck className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Resumo da semana {cur.week}
          </p>
          <p className="font-semibold text-sm">Visão geral da equipe</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <SummaryStat
          label="Respostas"
          value={`${summary.responderam}/${summary.total}`}
          sub={`${pct}%`}
          tone="primary"
        />
        <SummaryStat
          label="Média"
          value={summary.mediaIdx !== null ? `${summary.mediaIdx}` : "—"}
          sub="/10"
          tone="warning"
        />
        <SummaryStat
          label="Alertas"
          value={summary.alertos}
          sub="alto"
          tone={summary.alertos > 0 ? "destructive" : "success"}
        />
      </div>

      <div className="mt-4">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number | string;
  sub: string;
  tone: "primary" | "warning" | "destructive" | "success";
}) {
  const toneCls = {
    primary: "text-primary",
    warning: "text-warning",
    destructive: "text-destructive",
    success: "text-success",
  }[tone];
  return (
    <div className="bg-muted/40 rounded-xl p-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold leading-tight mt-1 ${toneCls}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function StressCard({
  last,
  loaded,
  respondedThisWeek,
}: {
  last: LastResponse | null;
  loaded: boolean;
  respondedThisWeek: boolean;
}) {
  if (!loaded) {
    return <div className="ios-card h-36 animate-pulse" />;
  }
  if (!last) {
    return (
      <div className="ios-card p-5 bg-primary text-primary-foreground border-transparent">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6" />
          <div>
            <p className="font-semibold">Bem-vindo!</p>
            <p className="text-sm opacity-90">Responda seu primeiro questionário para ver seu índice de estresse.</p>
          </div>
        </div>
      </div>
    );
  }
  const tone =
    last.stress_level === "baixo"
      ? "bg-success text-success-foreground"
      : last.stress_level === "moderado"
      ? "bg-warning text-warning-foreground"
      : "bg-destructive text-destructive-foreground";

  return (
    <div className={`ios-card p-5 border-transparent ${tone}`}>
      <p className="text-xs uppercase tracking-wider opacity-80">
        {respondedThisWeek ? "Esta semana" : "Última medição"}
      </p>
      <div className="flex items-end justify-between mt-1">
        <div>
          <p className="text-5xl font-bold leading-none">{last.stress_index}</p>
          <p className="text-sm font-medium opacity-90 mt-1">/10 · {stressLabel(last.stress_level)}</p>
        </div>
        <TrendingUp className="w-10 h-10 opacity-70" />
      </div>
    </div>
  );
}

function ShortcutCard({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof ClipboardList;
  label: string;
}) {
  return (
    <Link to={to} className="ios-pressable ios-card p-4 flex flex-col gap-2">
      <div className="w-9 h-9 rounded-xl bg-primary-soft text-primary grid place-items-center">
        <Icon className="w-5 h-5" />
      </div>
      <p className="font-medium">{label}</p>
    </Link>
  );
}
