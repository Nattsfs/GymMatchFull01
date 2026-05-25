import { Link, useLocation } from "@tanstack/react-router";
import { Flame, MessageCircle, User } from "lucide-react";

export function BottomNav() {
  const loc = useLocation();
  const items = [
    { to: "/discover", label: "Descobrir", Icon: Flame },
    { to: "/matches", label: "Matches", Icon: MessageCircle },
    { to: "/me", label: "Perfil", Icon: User },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur safe-bottom">
      <div className="mx-auto flex max-w-md justify-around px-2 pt-2">
        {items.map(({ to, label, Icon }) => {
          const active = loc.pathname === to || loc.pathname.startsWith(to + "/");
          return (
            <Link key={to} to={to}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-xs font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
              <Icon className={`h-5 w-5 ${active ? "fill-primary/20" : ""}`} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
