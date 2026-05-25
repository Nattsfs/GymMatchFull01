import { Link, useLocation } from "@tanstack/react-router";
import { Flame, MessageCircle, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function BottomNav() {
  const loc = useLocation();
  const { profile } = useAuth();

  const items = [
    { to: "/discover", label: "Descobrir", Icon: Flame },
    { to: "/matches",  label: "Matches",   Icon: MessageCircle },
    { to: "/me",       label: "Perfil",    Icon: User },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 bg-background/90 backdrop-blur-xl safe-bottom">
      <div className="mx-auto flex max-w-md border-t border-border/40 justify-around px-2 pt-1">
        {items.map(({ to, label, Icon }) => {
          const active = loc.pathname === to || loc.pathname.startsWith(to + "/");
          const isProfile = to === "/me";

          return (
            <Link
              key={to}
              to={to}
              className="relative flex flex-1 flex-col items-center gap-1 py-2"
            >
              {/* Indicator line */}
              <span
                className={`absolute top-0 h-[2px] w-8 rounded-full transition-all duration-300 ${
                  active ? "bg-gradient-primary opacity-100" : "opacity-0"
                }`}
              />

              <span
                className={`grid h-8 w-8 place-items-center rounded-xl transition-all duration-200 ${
                  active && !isProfile ? "bg-primary/15" : ""
                }`}
              >
                {isProfile && profile?.photo_url ? (
                  <img
                    src={profile.photo_url}
                    alt=""
                    className={`h-7 w-7 rounded-full object-cover transition-all duration-200 ${
                      active ? "ring-2 ring-primary" : "ring-1 ring-border"
                    }`}
                  />
                ) : (
                  <Icon
                    className={`h-[18px] w-[18px] transition-colors duration-200 ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                )}
              </span>

              <span
                className={`text-[10px] font-semibold leading-none transition-colors duration-200 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
