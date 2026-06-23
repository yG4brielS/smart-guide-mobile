import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, Loader2, NotebookPen, Trash2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatWeekRange, stressLabel, type StressLevel } from "@/lib/wellbeing";

export const Route = createFileRoute("/app/atletas/$id")({
  component: () => (
    <AuthGate allow={["psicologo", "treinador"]}>
      <AthleteDetail />
    </AuthGate>
  ),
});

interface Resp {
  id: string;
  user_id: string;
  year: number;
  week: number;
  stress_index: number;
  stress_level: StressLevel;
  vigor: number;
  fatigue: number;
  sleep_quality: number;
  performance: number;
  followup_note: string | null;
  created_at: string;
}

interface Note {
  id: string;
  content: string;
  created_at: string;
  author_user_id: string;
}

function AthleteDetail() {
  const { id } = Route.useParams();
  const { user, role } = useAuth();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [responses, setResponses] = useState<Resp[]>([]);
  const [teamResps, setTeamResps] = useState<Resp[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    // Primeiro busca o atleta + suas respostas e notas
    const [{ data: prof }, { data: resps }, { data: ns }, { data: roleRows }] = await Promise.all([
      supabase.from("profiles").select("full_name,code").eq("user_id", id).maybeSingle(),
      supabase
        .from("questionnaire_responses")
        .select("*")
        .eq("user_id", id)
        .order("year", { ascending: true })
        .order("week", { ascending: true }),
      supabase
        .from("psychologist_notes")
        .select("id,content,created_at,author_user_id")
        .eq("athlete_user_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id").eq("role", "atleta"),
    ]);
    if (prof) {
      setName(prof.full_name);
      setCode(prof.code);
    }
    setResponses((resps as Resp[]) ?? []);
    setNotes((ns as Note[]) ?? []);

    // respostas da equipe (todos atletas) para comparativo
    const ids = (roleRows ?? []).map((r) => r.user_id);
    if (ids.length > 0) {
      const { data: tr } = await supabase
        .from("questionnaire_responses")
        .select("user_id,year,week,stress_index,vigor,fatigue")
        .in("user_id", ids);
      setTeamResps((tr as Resp[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (!user || !newNote.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("psychologist_notes").insert({
      athlete_user_id: id,
      author_user_id: user.id,
      content: newNote.trim(),
    });
    setSaving(false);
    if (!error) {
      setNewNote("");
      await load();
    }
  }

  async function deleteNote(noteId: string) {
    await supabase.from("psychologist_notes").delete().eq("id", noteId);
    await load();
  }

  const chartData = useMemo(() => {
    const years = new Set(responses.map((r) => r.year));
    const showYear = years.size > 1;
    // média da equipe por (year,week)
    const teamByWeek = new Map<string, { sum: number; n: number }>();
    teamResps.forEach((r) => {
      const k = `${r.year}-${r.week}`;
      const cur = teamByWeek.get(k) ?? { sum: 0, n: 0 };
      cur.sum += r.stress_index;
      cur.n++;
      teamByWeek.set(k, cur);
    });
    return responses.map((r) => {
      const t = teamByWeek.get(`${r.year}-${r.week}`);
      return {
        label: showYear ? `S${r.week}/${String(r.year).slice(-2)}` : `S${r.week}`,
        estresse: r.stress_index,
        vigor: r.vigor,
        fadiga: r.fatigue,
        equipe: t ? +(t.sum / t.n).toFixed(1) : null,
      };
    });
  }, [responses, teamResps]);

  if (loading) {
    return (
      <AppShell title="Atleta">
        <div className="grid place-items-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={name || "Atleta"}>
      <Link
        to="/app/atletas"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-3"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div className="ios-card p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground grid place-items-center text-lg font-semibold">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{name}</p>
            <p className="text-sm text-muted-foreground">{code}</p>
          </div>
        </div>
      </div>

      {responses.length > 0 && (
        <div className="ios-card p-4 mt-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Evolução</p>
          <h3 className="font-semibold mb-3">Estresse, Vigor e Fadiga</h3>
          <EvolutionChart data={chartData} />
        </div>
      )}

      <div className="mt-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-2">
          Respostas
        </p>
        {responses.length === 0 ? (
          <div className="ios-card p-5 text-center text-sm text-muted-foreground">
            Sem respostas ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {[...responses].reverse().map((r) => {
              const tone =
                r.stress_level === "baixo"
                  ? "bg-success/15 text-success"
                  : r.stress_level === "moderado"
                  ? "bg-warning/15 text-warning"
                  : "bg-destructive/15 text-destructive";
              return (
                <div key={r.id} className="ios-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">Semana {r.week}/{r.year}</p>
                      <p className="text-xs text-muted-foreground">{formatWeekRange(r.year, r.week)}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${tone}`}>
                      {r.stress_index}/10 · {stressLabel(r.stress_level)}
                    </span>
                  </div>
                  {r.followup_note && (
                    <p className="mt-2 text-sm text-muted-foreground italic border-l-2 border-primary pl-3">
                      “{r.followup_note}”
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Anotações do psicólogo */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-2 px-1">
          <NotebookPen className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Anotações</p>
        </div>

        {role === "psicologo" && (
          <form onSubmit={addNote} className="ios-card p-4 mb-3">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
              placeholder="Observação, recomendação ou alerta..."
              className="w-full rounded-xl bg-muted border border-border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={saving || !newNote.trim()}
              className="ios-pressable mt-3 w-full h-10 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Adicionar anotação
            </button>
          </form>
        )}

        {notes.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-3">
            Sem anotações ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="ios-card p-4">
                <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(n.created_at).toLocaleString("pt-BR")}</span>
                  {role === "psicologo" && n.author_user_id === user?.id && (
                    <button
                      onClick={() => deleteNote(n.id)}
                      className="ios-pressable inline-flex items-center gap-1 text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

interface ChartDatum {
  label: string;
  estresse: number;
  vigor: number;
  fadiga: number;
  equipe: number | null;
}

function EvolutionChart({ data }: { data: ChartDatum[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const series = [
    { key: "estresse", label: "Estresse", color: "var(--color-destructive)", dashed: false },
    { key: "vigor", label: "Vigor", color: "var(--color-primary)", dashed: false },
    { key: "fadiga", label: "Fadiga", color: "var(--color-warning)", dashed: false },
    { key: "equipe", label: "Média equipe", color: "var(--color-muted-foreground)", dashed: true },
  ] as const;

  const opacityFor = (k: string) => (hovered && hovered !== k ? 0.15 : 1);
  const widthFor = (k: string) => (hovered === k ? 3.5 : 2.25);

  return (
    <div>
      <div className="h-56 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
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
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={widthFor(s.key)}
                strokeOpacity={opacityFor(s.key)}
                strokeDasharray={s.dashed ? "5 4" : undefined}
                dot={{ r: 3, strokeOpacity: opacityFor(s.key), fillOpacity: opacityFor(s.key) }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-2 mt-3">
        {series.map((s) => {
          const active = hovered === s.key;
          const dim = hovered && !active;
          return (
            <button
              key={s.key}
              type="button"
              onMouseEnter={() => setHovered(s.key)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(s.key)}
              onBlur={() => setHovered(null)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                active
                  ? "border-transparent shadow-sm scale-105"
                  : dim
                  ? "border-border/60 opacity-40"
                  : "border-border/60"
              }`}
              style={
                active
                  ? { backgroundColor: s.color, color: "var(--color-primary-foreground)" }
                  : undefined
              }
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
