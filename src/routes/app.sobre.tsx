import { createFileRoute } from "@tanstack/react-router";
import { Heart, Target, Users, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FeevaleLogo } from "@/components/FeevaleLogo";

export const Route = createFileRoute("/app/sobre")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <AppShell title="Sobre o projeto">
      <div className="space-y-5">
        <div className="ios-card p-6 text-center">
          <div className="flex justify-center mb-3">
            <FeevaleLogo />
          </div>
          <h2 className="text-xl font-bold">Bem-Estar</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoramento do bem-estar de atletas universitários da Universidade Feevale —
            Rio Grande do Sul.
          </p>
        </div>

        <Section icon={Target} title="Objetivo">
          Acompanhar de forma contínua o estado psicoemocional e o índice de estresse
          dos atletas universitários, oferecendo suporte preventivo por meio de
          psicólogos e treinadores. A iniciativa busca melhorar desempenho esportivo,
          qualidade de vida e adesão à rotina de treinos.
        </Section>

        <Section icon={Heart} title="Como funciona">
          Cada atleta responde, uma vez por semana, a um questionário breve com base em
          variáveis validadas (tensão, depressão, raiva, vigor, fadiga, confusão,
          situações externas, situações esportivas, qualidade do sono e desempenho).
          O sistema calcula um índice de estresse semanal e exibe a evolução ao longo
          do tempo. Casos de estresse moderado ou alto geram alertas para a equipe
          técnica.
        </Section>

        <Section icon={ShieldCheck} title="Privacidade">
          As respostas são individuais e protegidas. Apenas o próprio atleta vê o
          detalhe de suas respostas. Psicólogos e treinadores acessam visões agregadas e
          o histórico necessário para o acompanhamento. As anotações do psicólogo são
          confidenciais.
        </Section>

        <Section icon={Users} title="Responsáveis">
          <ul className="space-y-1 text-sm">
            <li>• [Nome do responsável principal] — Coordenação</li>
            <li>• [Nome do(a) psicólogo(a) responsável] — Acompanhamento psicológico</li>
            <li>• [Nome do(a) treinador(a) responsável] — Equipe técnica</li>
            <li>• [Nome do(a) orientador(a) acadêmico(a)] — Orientação</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            Envie os nomes finais para serem incluídos aqui.
          </p>
        </Section>

        <p className="text-center text-xs text-muted-foreground pt-2">
          Bem-Estar v1.0 · Universidade Feevale
        </p>
      </div>
    </AppShell>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Target;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ios-card p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-xl bg-primary-soft text-primary grid place-items-center">
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}
