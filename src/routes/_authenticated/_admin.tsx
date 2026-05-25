import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Dumbbell, LayoutDashboard, Users, AlertTriangle, Building2, Megaphone, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin")({ component: AdminLayout });

function AdminLayout() {
  const { isAdmin, loading, signOut } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    if (!loading && !isAdmin) nav({ to: "/discover" });
  }, [loading, isAdmin, nav]);

  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Carregando...</div>;
  if (!isAdmin) return null;

  const items = [
    { to: "/admin", label: "Painel", Icon: LayoutDashboard, exact: true },
    { to: "/admin/users", label: "Usuários", Icon: Users },
    { to: "/admin/reports", label: "Denúncias", Icon: AlertTriangle },
    { to: "/admin/gyms", label: "Academias", Icon: Building2 },
    { to: "/admin/announcements", label: "Avisos", Icon: Megaphone },
  ];

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-sidebar-border bg-sidebar lg:block">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary"><Dumbbell className="h-4 w-4 text-primary-foreground" /></div>
          <span className="font-display text-lg font-bold">Admin</span>
        </div>
        <nav className="p-3">
          {items.map(({ to, label, Icon, exact }) => {
            const active = exact ? loc.pathname === to : loc.pathname === to || loc.pathname.startsWith(to + "/");
            return (
              <Link key={to} to={to} className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"}`}>
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
        </nav>
        <button onClick={signOut} className="mx-3 mt-4 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </aside>
      <main className="min-w-0">
        <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3 lg:hidden">
          <span className="font-display font-bold">Admin</span>
          <Link to="/discover" className="text-sm text-muted-foreground">Visão do aluno →</Link>
        </header>
        <div className="overflow-x-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
