import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getLuciaHistory, getLuciaUnread } from "@/lib/lucia";
import { LuciaAvatar } from "@/routes/_authenticated/chat.lucia";

type Notif = { id: string; message: string };

export function LuciaNotif() {
  const nav = useNavigate();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    function onHistoryChanged() {
      // Não mostra se já está no chat da Lucia
      if (window.location.pathname === '/chat/lucia') return;

      const unread = getLuciaUnread();
      if (unread <= 0) return;

      const history = getLuciaHistory();
      const latest = [...history].reverse().find((m) => m.from === 'lucia');
      if (!latest) return;

      const id = latest.id;
      setNotifs((prev) => {
        if (prev.some((n) => n.id === id)) return prev;
        return [...prev, { id, message: latest.content }];
      });

      // Auto-dismiss após 6s
      const t = setTimeout(() => dismiss(id), 6000);
      timers.current.set(id, t);
    }

    window.addEventListener('lucia:history-changed', onHistoryChanged);
    return () => window.removeEventListener('lucia:history-changed', onHistoryChanged);
  }, []);

  // Limpa todos os timers no unmount
  useEffect(() => {
    const map = timers.current;
    return () => { map.forEach(clearTimeout); };
  }, []);

  function dismiss(id: string) {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }

  function open(id: string) {
    dismiss(id);
    nav({ to: '/chat/lucia' });
  }

  if (notifs.length === 0) return null;

  return (
    <div className="fixed top-3 inset-x-0 z-[9999] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {notifs.map((n) => (
        <div key={n.id} className="pointer-events-auto w-full max-w-sm lucia-notif-enter">
          <div className="relative overflow-hidden rounded-2xl shadow-2xl">
            {/* Gradiente sutil na borda */}
            <div className="absolute inset-0 rounded-2xl p-px bg-gradient-to-br from-pink-500/30 via-violet-500/20 to-transparent pointer-events-none" />

            <button
              type="button"
              onClick={() => open(n.id)}
              className="relative w-full flex items-start gap-3 bg-background/90 backdrop-blur-2xl rounded-2xl px-4 py-3.5 text-left"
            >
              <div className="shrink-0 mt-0.5">
                <LuciaAvatar size={36} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold leading-none">Lucia</span>
                    <span
                      className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none"
                      style={{ background: '#EEEDFE', color: '#3C3489' }}
                    >
                      assistente
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">agora</span>
                </div>

                <p className="text-[12px] text-foreground/80 line-clamp-2 leading-snug">
                  {n.message}
                </p>

                <p className="text-[10px] text-pink-500 mt-1.5 font-medium">
                  Toque para abrir →
                </p>
              </div>

              {/* Botão fechar */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground text-lg leading-none -mt-0.5 -mr-1 px-1"
                aria-label="Fechar"
              >
                ×
              </button>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
