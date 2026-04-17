import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Menu,
  Home,
  ClipboardList,
  History,
  Settings,
  LogOut,
  Users,
  AlertCircle,
  X,
  Sun,
  Moon,
  Activity,
} from "lucide-react";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { signOut } from "@/lib/auth-helpers";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  roles: AppRole[];
}

const NAV: NavItem[] = [
  { to: "/app", label: "Início", icon: Home, roles: ["atleta", "psicologo", "treinador"] },
  { to: "/app/questionario", label: "Questionário", icon: ClipboardList, roles: ["atleta"] },
  { to: "/app/historico", label: "Histórico", icon: History, roles: ["atleta"] },
  { to: "/app/atletas", label: "Atletas", icon: Users, roles: ["psicologo", "treinador"] },
  { to: "/app/alertas", label: "Alertas", icon: AlertCircle, roles: ["treinador"] },
  { to: "/app/configuracoes", label: "Configurações", icon: Settings, roles: ["atleta", "psicologo", "treinador"] },
];

const ROLE_LABEL: Record<AppRole, string> = {
  atleta: "Atleta",
  psicologo: "Psicólogo(a)",
  treinador: "Treinador(a)",
};

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const { profile, role } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // fecha o drawer ao trocar de rota
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const items = NAV.filter((n) => (role ? n.roles.includes(role) : false));

  async function handleLogout() {
    await signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border safe-top">
        <div className="mx-auto max-w-md flex items-center justify-between px-4 h-14">
          <button
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            className="ios-pressable p-2 -ml-2 rounded-full text-foreground"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="font-semibold text-base tracking-tight truncate">
            {title ?? "Bem-Estar"}
          </h1>
          <button
            onClick={toggle}
            aria-label="Alternar tema"
            className="ios-pressable p-2 -mr-2 rounded-full text-foreground"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="mx-auto max-w-md px-4 py-5 safe-bottom">{children}</main>

      {/* Drawer overlay */}
      {open && (
        <button
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in"
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] bg-sidebar text-sidebar-foreground",
          "border-r border-sidebar-border shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
          "safe-top safe-bottom flex flex-col"
        )}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-soft">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold leading-tight">Bem-Estar</p>
              <p className="text-xs text-muted-foreground leading-tight">Atletas Universitários</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar"
            className="ios-pressable p-2 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {profile && (
          <div className="px-5 pb-4">
            <div className="rounded-2xl bg-sidebar-accent text-sidebar-accent-foreground px-4 py-3">
              <p className="text-xs opacity-80">{ROLE_LABEL[role ?? "atleta"]}</p>
              <p className="font-semibold truncate">{profile.full_name}</p>
              <p className="text-xs opacity-70 mt-0.5">Código: {profile.code}</p>
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 pb-3">
          {items.map((item) => {
            const active =
              item.to === "/app"
                ? location.pathname === "/app"
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium ios-pressable",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-5 pt-2 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-destructive hover:bg-destructive/10 ios-pressable"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>
    </div>
  );
}
