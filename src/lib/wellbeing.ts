// Utilitários de domínio: cálculo de estresse, semana ISO, formatação.

export type StressLevel = "baixo" | "moderado" | "alto";

export interface QuestionnaireInput {
  tension: number;
  depression: number;
  anger: number;
  vigor: number;
  fatigue: number;
  confusion: number;
}

export function computeStress(q: QuestionnaireInput): {
  index: number;
  level: StressLevel;
} {
  const raw =
    q.tension + q.depression + q.anger + q.fatigue + q.confusion - q.vigor;
  // Normaliza em uma escala 0-10 amigável, mantendo a fórmula do documento.
  // raw varia de -10 a 50; clampamos e mapeamos.
  const clamped = Math.max(0, Math.min(50, raw));
  const index = Math.round((clamped / 50) * 10);

  let level: StressLevel = "baixo";
  if (index >= 7) level = "alto";
  else if (index >= 4) level = "moderado";
  return { index, level };
}

export function stressColor(level: StressLevel): string {
  switch (level) {
    case "baixo":
      return "var(--color-success)";
    case "moderado":
      return "var(--color-warning)";
    case "alto":
      return "var(--color-destructive)";
  }
}

export function stressLabel(level: StressLevel): string {
  return { baixo: "Baixo", moderado: "Moderado", alto: "Alto" }[level];
}

// ISO week — segunda a domingo
export function isoYearWeek(date = new Date()): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((+d - +yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

export function formatWeekRange(year: number, week: number): string {
  // segunda da semana ISO
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dayOfWeek = simple.getUTCDay();
  const monday = new Date(simple);
  if (dayOfWeek <= 4) monday.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  else monday.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}
