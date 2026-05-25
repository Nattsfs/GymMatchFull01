import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Star } from "lucide-react";
import {
  LUCIA_BOT,
  WELCOME_MESSAGES,
  QUICK_REPLIES,
  getLuciaHistory,
  setLuciaHistory,
  hasWelcomed,
  markWelcomed,
  setLuciaUnread,
  type LuciaMessage,
} from "@/lib/lucia";

export const Route = createFileRoute("/_authenticated/chat/lucia")({ component: LuciaChat });

function LuciaChat() {
  const nav = useNavigate();
  const [msgs, setMsgs] = useState<LuciaMessage[]>(() => getLuciaHistory());
  const [text, setText] = useState("");
  const [showQuick, setShowQuick] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Clear unread on open
  useEffect(() => { setLuciaUnread(0); }, []);

  // Welcome flow
  useEffect(() => {
    if (hasWelcomed()) { setShowQuick(true); return; }
    let cancelled = false;
    (async () => {
      const out: LuciaMessage[] = [];
      for (const content of WELCOME_MESSAGES) {
        await new Promise((r) => setTimeout(r, 600));
        if (cancelled) return;
        const m: LuciaMessage = { id: crypto.randomUUID(), from: "lucia", content, created_at: Date.now() };
        out.push(m);
        setMsgs((prev) => {
          const next = [...prev, m];
          setLuciaHistory(next);
          return next;
        });
      }
      markWelcomed();
      setShowQuick(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  function push(m: LuciaMessage) {
    setMsgs((prev) => { const next = [...prev, m]; setLuciaHistory(next); return next; });
  }

  function sendUser(content: string) {
    if (!content.trim()) return;
    push({ id: crypto.randomUUID(), from: "user", content: content.trim(), created_at: Date.now() });
    setText("");
    setTimeout(() => {
      push({
        id: crypto.randomUUID(),
        from: "lucia",
        content: "Obrigada pela mensagem! Use os atalhos abaixo para temas específicos, ou fale com nosso suporte: suporte@gymmatch.app",
        created_at: Date.now(),
      });
    }, 500);
  }

  function quick(reply: string) {
    push({ id: crypto.randomUUID(), from: "lucia", content: reply, created_at: Date.now() });
  }

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button onClick={() => nav({ to: "/matches" })} aria-label="Voltar"><ArrowLeft className="h-5 w-5" /></button>
        <LuciaAvatar />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-display font-semibold leading-tight">{LUCIA_BOT.name}</p>
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ background: LUCIA_BOT.avatarBg, color: LUCIA_BOT.avatarText }}
            >{LUCIA_BOT.tag}</span>
          </div>
          <p className="text-xs text-green-600">{LUCIA_BOT.status}</p>
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {msgs.map((m) => {
          const mine = m.from === "user";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-gradient-primary text-primary-foreground" : "border border-border bg-card"}`}>
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {showQuick && (
        <div className="flex flex-wrap gap-2 border-t border-border bg-background px-3 py-2">
          {QUICK_REPLIES.map((q) => (
            <button
              key={q.label}
              onClick={() => quick(q.reply)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >{q.label}</button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-border bg-background px-3 py-2 safe-bottom">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendUser(text)}
          placeholder="Escreva para a Lucia..."
          aria-label="Mensagem para Lucia"
          className="flex-1 rounded-full border border-border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button onClick={() => sendUser(text)} aria-label="Enviar" className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-primary-foreground">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function LuciaAvatar({ size = 40 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="grid h-full w-full place-items-center rounded-full font-display font-bold"
        style={{
          background: LUCIA_BOT.avatarBg,
          color: LUCIA_BOT.avatarText,
          border: `2px solid ${LUCIA_BOT.borderColor}`,
          fontSize: size * 0.4,
        }}
      >{LUCIA_BOT.initials}</div>
      <div
        className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full"
        style={{ background: LUCIA_BOT.borderColor }}
        aria-hidden
      >
        <Star className="h-2.5 w-2.5 text-white" fill="white" />
      </div>
    </div>
  );
}
