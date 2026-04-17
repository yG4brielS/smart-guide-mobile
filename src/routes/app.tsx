import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthGate } from "@/components/AuthGate";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <AuthGate>
      <Outlet />
    </AuthGate>
  );
}
