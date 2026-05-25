import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  WELCOME_MESSAGES,
  getLuciaHistory,
  setLuciaHistory,
  getLuciaLastActivity,
  setLuciaLastActivity,
  getLuciaUnread,
  setLuciaUnread,
  type LuciaMessage,
} from "@/lib/lucia";
import { fireLuciaPush } from "@/lib/push";

export const Route = createFileRoute("/_authenticated")({ component: Gate });

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const WARN_MS = 10 * 60 * 1000;
const RESET_MS = 3 * 60 * 1000;

function buildWelcome(): LuciaMessage[] {
  return WELCOME_MESSAGES.map((content, i) => ({
    id: `welcome-${i}`,
    from: "lucia" as const,
    content,
    created_at: Date.now() + i,
  }));
}

function Gate() {
  const { loading, session, profile } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  // App-level Lucia inactivity timer — runs even when user is outside the chat
  useEffect(() => {
    if (!session) return;

    let warnTimer: ReturnType<typeof setTimeout> | null = null;
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    function clearTimers() {
      if (warnTimer) clearTimeout(warnTimer);
      if (resetTimer) clearTimeout(resetTimer);
    }

    function notifyHistory() {
      window.dispatchEvent(new CustomEvent("lucia:history-changed"));
    }

    function scheduleTimers() {
      clearTimers();
      const lastActivity = getLuciaLastActivity();
      if (!lastActivity) return; // No active conversation yet

      const elapsed = Date.now() - lastActivity;
      const total = WARN_MS + RESET_MS;

      if (elapsed >= total) {
        // Already expired — reset silently
        setLuciaHistory(buildWelcome());
        setLuciaLastActivity(0);
        notifyHistory();
        return;
      }

      const warnRemaining = Math.max(0, WARN_MS - elapsed);

      warnTimer = setTimeout(() => {
        const current = getLuciaHistory();
        const warnMsg: LuciaMessage = {
          id: uid(),
          from: "lucia",
          content:
            "Ei, ainda está por aí? 👀 Sua conversa fica salva por mais 3 minutos — depois disso começo do zero!",
          created_at: Date.now(),
        };
        setLuciaHistory([...current, warnMsg]);
        setLuciaUnread(Math.max(getLuciaUnread(), 1));
        notifyHistory();
        // Notificação nativa — aparece mesmo quando usando outro app
        fireLuciaPush(warnMsg.content);

        resetTimer = setTimeout(() => {
          const current2 = getLuciaHistory();
          const byeMsg: LuciaMessage = {
            id: uid(),
            from: "lucia",
            content:
              "Parece que você saiu. Encerrando a conversa e começando do zero quando voltar. Até logo! 👋",
            created_at: Date.now(),
          };
          setLuciaHistory([...current2, byeMsg]);
          notifyHistory();

          // Pequena pausa para o usuário ler a mensagem de despedida se estiver no chat
          setTimeout(() => {
            setLuciaHistory(buildWelcome());
            setLuciaLastActivity(0);
            setLuciaUnread(1); // Badge permanece para o usuário saber que algo aconteceu
            notifyHistory();
          }, 2000);
        }, RESET_MS);
      }, warnRemaining);
    }

    scheduleTimers();

    // LuciaChat dispatches this when user sends a message
    function onActivity() {
      scheduleTimers();
    }
    window.addEventListener("lucia:reset-timer", onActivity);

    return () => {
      clearTimers();
      window.removeEventListener("lucia:reset-timer", onActivity);
    };
  }, [session]);

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
