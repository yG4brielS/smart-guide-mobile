import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { computeStress, isoYearWeek } from "@/lib/wellbeing";

export const Route = createFileRoute("/app/questionario")({
  component: () => (
    <AuthGate allow={["atleta"]}>
      <Questionnaire />
    </AuthGate>
  ),
});

interface Question {
  key: string;
  title: string;
  description: string;
  scale: 0 | 1; // 0: 0–10, 1: 0–4
  minLabel: string;
  maxLabel: string;
}

const QUESTIONS: Question[] = [
  { key: "tension", title: "Tensão–Ansiedade", description: "Quão tenso, preocupado ou sob pressão você se sentiu nesta semana?", scale: 0, minLabel: "Nada", maxLabel: "Extremamente" },
  { key: "depression", title: "Depressão–Desânimo", description: "Quão desanimado, sem motivação ou para baixo você se sentiu?", scale: 0, minLabel: "Nada", maxLabel: "Extremamente" },
  { key: "anger", title: "Raiva–Hostilidade", description: "Quão irritado, frustrado ou com raiva você se sentiu?", scale: 0, minLabel: "Nada", maxLabel: "Extremamente" },
  { key: "vigor", title: "Vigor–Atividade", description: "Quão cheio de energia, disposto e motivado você se sentiu?", scale: 0, minLabel: "Nada", maxLabel: "Extremamente" },
  { key: "fatigue", title: "Fadiga–Inércia", description: "Quão cansado, sem energia ou esgotado você se sentiu?", scale: 0, minLabel: "Nada", maxLabel: "Extremamente" },
  { key: "confusion", title: "Confusão–Desorientação", description: "Quão mentalmente confuso ou disperso você se sentiu?", scale: 0, minLabel: "Nada", maxLabel: "Extremamente" },
  { key: "external_situations", title: "Situações fora do esporte", description: "Quanto situações fora do esporte (família, escola, finanças) te geraram estresse?", scale: 1, minLabel: "Nenhum", maxLabel: "Muito alto" },
  { key: "sport_situations", title: "Relacionamento no esporte", description: "Como você avalia seu relacionamento com colegas e comissão técnica?", scale: 1, minLabel: "Muito ruim", maxLabel: "Muito bom" },
  { key: "sleep_quality", title: "Qualidade do sono", description: "Como você avalia a qualidade do seu sono nesta semana?", scale: 1, minLabel: "Muito ruim", maxLabel: "Muito boa" },
  { key: "performance", title: "Desempenho", description: "Como você avalia seu desempenho nos treinos/competições?", scale: 1, minLabel: "Muito ruim", maxLabel: "Muito bom" },
];

function Questionnaire() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [followup, setFollowup] = useState("");
  const [needsFollowup, setNeedsFollowup] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // bloqueio 1x/semana + checa duas semanas anteriores com estresse alto
  useEffect(() => {
    if (!user) return;
    (async () => {
      const cur = isoYearWeek();
      const { data: existing } = await supabase
        .from("questionnaire_responses")
        .select("id")
        .eq("user_id", user.id)
        .eq("year", cur.year)
        .eq("week", cur.week)
        .maybeSingle();
      if (existing) setAlreadyDone(true);

      const { data: recent } = await supabase
        .from("questionnaire_responses")
        .select("stress_level,year,week,created_at")
        .order("created_at", { ascending: false })
        .limit(2);
      if (recent && recent.length >= 2 && recent.every((r) => r.stress_level === "alto")) {
        setNeedsFollowup(true);
      }
      setLoadingCheck(false);
    })();
  }, [user]);

  const total = QUESTIONS.length + (needsFollowup ? 1 : 0);
  const progress = Math.round(((step + (alreadyDone ? 0 : 0)) / total) * 100);

  const currentQ = QUESTIONS[step];
  const isFollowupStep = needsFollowup && step === QUESTIONS.length;

  const canAdvance = useMemo(() => {
    if (isFollowupStep) return true; // followup é opcional
    return currentQ ? answers[currentQ.key] !== undefined : false;
  }, [currentQ, answers, isFollowupStep]);

  function setValue(v: number) {
    if (!currentQ) return;
    setAnswers((a) => ({ ...a, [currentQ.key]: v }));
  }

  async function submit() {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      const cur = isoYearWeek();
      const { index, level } = computeStress({
        tension: answers.tension,
        depression: answers.depression,
        anger: answers.anger,
        vigor: answers.vigor,
        fatigue: answers.fatigue,
        confusion: answers.confusion,
      });
      const { error: insErr } = await supabase.from("questionnaire_responses").insert({
        user_id: user.id,
        year: cur.year,
        week: cur.week,
        tension: answers.tension,
        depression: answers.depression,
        anger: answers.anger,
        vigor: answers.vigor,
        fatigue: answers.fatigue,
        confusion: answers.confusion,
        external_situations: answers.external_situations,
        sport_situations: answers.sport_situations,
        sleep_quality: answers.sleep_quality,
        performance: answers.performance,
        followup_note: needsFollowup ? followup || null : null,
        stress_index: index,
        stress_level: level,
      });
      if (insErr) throw insErr;
      navigate({ to: "/app/historico" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingCheck) {
    return (
      <AppShell title="Questionário">
        <div className="grid place-items-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (alreadyDone) {
    return (
      <AppShell title="Questionário">
        <div className="ios-card p-6 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-success/15 text-success grid place-items-center mb-3">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="font-semibold text-lg">Já respondido esta semana</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Você poderá responder novamente na próxima segunda-feira.
          </p>
          <Link
            to="/app/historico"
            className="ios-pressable inline-flex mt-5 px-5 h-11 rounded-2xl bg-primary text-primary-foreground items-center font-medium"
          >
            Ver histórico
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Questionário">
      {/* Progresso */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Passo {step + 1} de {total}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {!isFollowupStep && currentQ && (
        <div className="ios-card p-5">
          <h3 className="font-semibold text-lg leading-tight">{currentQ.title}</h3>
          <p className="text-sm text-muted-foreground mt-2">{currentQ.description}</p>

          <div className="mt-6">
            <div className="flex justify-between text-xs text-muted-foreground mb-3 px-1">
              <span>{currentQ.minLabel}</span>
              <span>{currentQ.maxLabel}</span>
            </div>
            <ScaleSelector
              max={currentQ.scale === 0 ? 10 : 4}
              value={answers[currentQ.key]}
              onChange={setValue}
            />
          </div>
        </div>
      )}

      {isFollowupStep && (
        <div className="ios-card p-5">
          <h3 className="font-semibold text-lg leading-tight">Acompanhamento</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Notamos índices elevados nas últimas semanas. Quer compartilhar como você está se sentindo? (opcional)
          </p>
          <textarea
            value={followup}
            onChange={(e) => setFollowup(e.target.value)}
            rows={5}
            placeholder="Escreva aqui..."
            className="mt-4 w-full rounded-2xl bg-card border border-border p-4 text-base focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3 border border-destructive/20">
          {error}
        </div>
      )}

      {/* Navegação */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="ios-pressable h-12 px-4 rounded-2xl bg-muted text-foreground font-medium disabled:opacity-40 flex items-center gap-1"
        >
          <ChevronLeft className="w-5 h-5" />
          Voltar
        </button>
        {step < total - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance}
            className="ios-pressable flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
          >
            Próxima
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!canAdvance || submitting}
            className="ios-pressable flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
            Enviar
          </button>
        )}
      </div>
    </AppShell>
  );
}

function ScaleSelector({
  max,
  value,
  onChange,
}: {
  max: number;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  const items = Array.from({ length: max + 1 }, (_, i) => i);
  return (
    <div className={`grid gap-2 ${max === 10 ? "grid-cols-6" : "grid-cols-5"}`}>
      {items.map((n) => {
        const selected = value === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={[
              "ios-pressable h-12 rounded-xl font-semibold text-base border transition-colors",
              selected
                ? "bg-primary text-primary-foreground border-primary shadow-soft"
                : "bg-card text-foreground border-border hover:bg-accent",
            ].join(" ")}
            aria-pressed={selected}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
