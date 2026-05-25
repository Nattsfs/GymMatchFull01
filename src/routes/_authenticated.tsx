import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated")({ component: Gate });

function Gate() {
  const { loading, session, profile } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      nav({ to: "/auth" });
      return;
    }
    if (profile && !profile.profile_complete && !loc.pathname.startsWith("/onboarding")) {
      nav({ to: "/onboarding" });
    }
  }, [loading, session, profile, loc.pathname, nav]);

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">Carregando...</div>
    );
  }
  return <Outlet />;
}
