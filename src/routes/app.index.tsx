import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ClipboardList, History as HistoryIcon, TrendingUp, Users, AlertCircle, Sparkles } from "lucide-react";
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

function HomePage() {
  const { profile, role } = useAuth();
  const [last, setLast] = useState<LastResponse | null>(null);
  const [respondedThisWeek, setRespondedThisWeek] = useState(false);
  const [teamCount, setTeamCount] = useState(0);
  const [highStress, setHighStress] = useState(0);
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
        // psicologo / treinador — visão de equipe
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });
        setTeamCount(count ?? 0);

        // últimas respostas com estresse alto
        const { count: highCount } = await supabase
          .from("questionnaire_responses")
          .select("*", { count: "exact", head: true })
          .eq("stress_level", "alto");
        setHighStress(highCount ?? 0);
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
            {/* Card de estresse */}
            <StressCard last={last} loaded={loaded} respondedThisWeek={respondedThisWeek} />

            {/* CTA questionário */}
            <Link
              to="/app/questionario"
              className="ios-pressable block ios-card p-5"
            >
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

            {/* Atalhos */}
            <div className="grid grid-cols-2 gap-3">
              <ShortcutCard to="/app/historico" icon={HistoryIcon} label="Histórico" />
              <ShortcutCard to="/app/configuracoes" icon={Sparkles} label="Perfil" />
            </div>
          </>
        )}

        {(role === "psicologo" || role === "treinador") && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Atletas" value={teamCount} icon={Users} />
              <StatCard label="Alertas altos" value={highStress} icon={AlertCircle} tone="warn" />
            </div>
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

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  tone?: "warn";
}) {
  return (
    <div className="ios-card p-4">
      <div
        className={`w-9 h-9 rounded-xl grid place-items-center mb-2 ${
          tone === "warn" ? "bg-warning/15 text-warning" : "bg-primary-soft text-primary"
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
