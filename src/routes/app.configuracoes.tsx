import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Lock, LogOut, Moon, Sun, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { signOut } from "@/lib/auth-helpers";

export const Route = createFileRoute("/app/configuracoes")({
  component: SettingsPage,
});

const ROLE_LABEL = {
  atleta: "Atleta",
  psicologo: "Psicólogo(a)",
  treinador: "Treinador(a)",
} as const;

function SettingsPage() {
  const { profile, role } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate({ to: "/login" });
  }

  return (
    <AppShell title="Configurações">
      <div className="space-y-5">
        {/* Perfil */}
        <div className="ios-card p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center text-xl font-semibold">
              {profile?.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{profile?.full_name}</p>
              <p className="text-sm text-muted-foreground">
                {role && ROLE_LABEL[role]} · {profile?.code}
              </p>
            </div>
          </div>
        </div>

        {/* Conta */}
        <SettingsGroup title="Conta">
          <SettingsRow
            icon={Lock}
            label="Alterar senha"
            to="/app/alterar-senha"
          />
        </SettingsGroup>

        {/* Aparência */}
        <SettingsGroup title="Aparência">
          <button
            onClick={toggle}
            className="ios-pressable w-full flex items-center gap-3 px-4 py-3.5 text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-primary-soft text-primary grid place-items-center">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <p className="font-medium">Modo {theme === "dark" ? "claro" : "noturno"}</p>
              <p className="text-xs text-muted-foreground">
                Atual: {theme === "dark" ? "noturno" : "claro"}
              </p>
            </div>
          </button>
        </SettingsGroup>

        {/* Sair */}
        <button
          onClick={handleLogout}
          className="ios-pressable w-full ios-card flex items-center gap-3 px-4 py-3.5 text-destructive"
        >
          <div className="w-9 h-9 rounded-xl bg-destructive/15 grid place-items-center">
            <LogOut className="w-5 h-5" />
          </div>
          <span className="font-medium">Sair da conta</span>
        </button>

        <p className="text-center text-xs text-muted-foreground pt-2">
          Bem-Estar v1.0
        </p>
      </div>
    </AppShell>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground px-2 mb-2">{title}</p>
      <div className="ios-card overflow-hidden divide-y divide-border">{children}</div>
    </div>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  to,
}: {
  icon: typeof User;
  label: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="ios-pressable flex items-center gap-3 px-4 py-3.5"
    >
      <div className="w-9 h-9 rounded-xl bg-primary-soft text-primary grid place-items-center">
        <Icon className="w-5 h-5" />
      </div>
      <span className="flex-1 font-medium">{label}</span>
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </Link>
  );
}
