import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Star, Trash2 } from "lucide-react";
import {
  LUCIA_BOT,
  WELCOME_MESSAGES,
  QUICK_REPLIES,
  getLuciaResponse,
  getLuciaHistory,
  setLuciaHistory,
  setLuciaUnread,
  getLuciaLastActivity,
  setLuciaLastActivity,
  type LuciaMessage,
} from "@/lib/lucia";
import { askNotifPermission } from "@/lib/push";

export const Route = createFileRoute("/_authenticated/chat/lucia")({ component: LuciaChat });

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const SYSTEM_PROMPT = `Você é a Lucia, assistente virtual do GymMatch — um app de conexões para pessoas que frequentam academia, similar ao Tinder mas focado em fitness e treino.

Informações do GymMatch:
- Plano Free: 20 likes/dia, até 5 matches ativos, chat por texto
- Plano Gold (R$ 29,90/mês): likes ilimitados, até 20 matches, envio de imagens, desfazer última ação
- Plano Diamond (R$ 59,90/mês): tudo ilimitado, boost semanal, filtros avançados, badge exclusivo
- Matches: dois usuários da mesma academia que se curtiram mutuamente
- O chat é liberado após o match
- Dá para bloquear e denunciar pelo chat
- Para suporte humano: suporte@gymmatch.app

Instruções:
- Responda SEMPRE em português brasileiro informal e simpático
- Seja concisa (máximo 3 parágrafos curtos)
- Use emojis com moderação
- Não invente funcionalidades não listadas acima
- Se não souber, direcione para suporte@gymmatch.app`;

async function askGroq(history: LuciaMessage[], userText: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY as string;
  if (!apiKey) return getLuciaResponse(userText);

  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-10).map((m) => ({
        role: m.from === "user" ? "user" : "assistant",
        content: m.content,
      })),
    ];
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama-3.1-8b-instant", max_tokens: 400, messages }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content ?? getLuciaResponse(userText);
  } catch {
    return getLuciaResponse(userText);
  }
}

function MsgText({ content }: { content: string }) {
  const tokens = content.split(/(\*\*[^*]+\*\*|suporte@gymmatch\.app)/g);
  return (
    <>
      {tokens.map((token, i) => {
        if (token.startsWith("**") && token.endsWith("**")) {
          return <strong key={i}>{token.slice(2, -2)}</strong>;
        }
        if (token === "suporte@gymmatch.app") {
          return (
            <a key={i} href="mailto:suporte@gymmatch.app" className="underline font-semibold">
              suporte@gymmatch.app
            </a>
          );
        }
        return <span key={i}>{token}</span>;
      })}
    </>
  );
}

const WARN_MS = 10 * 60 * 1000;
const RESET_MS = 3 * 60 * 1000;

const RESOLUTION_KEYWORDS = [
  "obrigado", "obrigada", "valeu", "resolvido", "resolveu",
  "funcionou", "consegui", "entendi", "ok", "ótimo", "perfeito", "tchau",
];

function buildWelcome(): LuciaMessage[] {
  return WELCOME_MESSAGES.map((content, i) => ({
    id: `welcome-${i}`,
    from: "lucia" as const,
    content,
    created_at: Date.now() + i,
  }));
}

function LuciaChat() {
  const nav = useNavigate();
  const [msgs, setMsgs] = useState<LuciaMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">("default");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!("Notification" in window)) { setNotifPerm("unsupported"); return; }
    setNotifPerm(Notification.permission);
  }, []);

  async function enableNotifs() {
    const granted = await askNotifPermission();
    setNotifPerm(granted ? "granted" : "denied");
  }

  function resetConversation() {
    const fresh = buildWelcome();
    setMsgs(fresh);
    setLuciaHistory(fresh);
    setLuciaLastActivity(0);
    // Notify Gate to cancel pending timers
    window.dispatchEvent(new CustomEvent("lucia:reset-timer"));
  }

  useEffect(() => {
    setLuciaUnread(0);
    const history = getLuciaHistory();
    const lastActivity = getLuciaLastActivity();
    const elapsed = lastActivity ? Date.now() - lastActivity : 0;
    const totalTimeout = WARN_MS + RESET_MS;

    if (history.length > 0 && elapsed > totalTimeout) {
      const fresh = buildWelcome();
      setMsgs(fresh);
      setLuciaHistory(fresh);
    } else if (history.length > 0) {
      setMsgs(history);
    } else {
      const initial = buildWelcome();
      setMsgs(initial);
      setLuciaHistory(initial);
    }

    // Listen for history changes pushed by the app-level Gate timer
    function onHistoryChanged() {
      setMsgs(getLuciaHistory());
      setLuciaUnread(0); // User is here, clear badge
    }
    window.addEventListener("lucia:history-changed", onHistoryChanged);
    return () => window.removeEventListener("lucia:history-changed", onHistoryChanged);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  async function sendContent(content: string) {
    const trimmed = content.trim();
    if (!trimmed || loading) return;

    const resolved = RESOLUTION_KEYWORDS.some((kw) => trimmed.toLowerCase().includes(kw));

    setText("");
    setLoading(true);
    setLuciaLastActivity(Date.now());
    window.dispatchEvent(new CustomEvent("lucia:reset-timer"));

    const userMsg: LuciaMessage = { id: uid(), from: "user", content: trimmed, created_at: Date.now() };
    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs);
    setLuciaHistory(newMsgs);

    if (resolved) {
      await new Promise((r) => setTimeout(r, 700));
      const goodbyeMsg: LuciaMessage = {
        id: uid(),
        from: "lucia",
        content: "Fico feliz que pude ajudar! 😊 Encerrando nossa conversa por aqui. Se precisar, é só voltar. Até logo! 👋",
        created_at: Date.now(),
      };
      const closing = [...newMsgs, goodbyeMsg];
      setMsgs(closing);
      setLuciaHistory(closing);
      setLoading(false);
      setTimeout(resetConversation, 3000);
      return;
    }

    try {
      const reply = await askGroq(newMsgs, trimmed);
      const luciaMsg: LuciaMessage = { id: uid(), from: "lucia", content: reply, created_at: Date.now() };
      const finalMsgs = [...newMsgs, luciaMsg];
      setMsgs(finalMsgs);
      setLuciaHistory(finalMsgs);
    } catch {
      const errMsg: LuciaMessage = { id: uid(), from: "lucia", content: "Ops, tive um probleminha. Tente novamente! 🙏", created_at: Date.now() };
      setMsgs([...newMsgs, errMsg]);
      setLuciaHistory([...newMsgs, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button onClick={() => nav({ to: "/matches" })} aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <LuciaAvatar />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold leading-tight">{LUCIA_BOT.name}</p>
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ background: LUCIA_BOT.avatarBg, color: LUCIA_BOT.avatarText }}
            >
              {LUCIA_BOT.tag}
            </span>
          </div>
          <p className="text-xs text-green-500">{loading ? "digitando..." : LUCIA_BOT.status}</p>
        </div>
        <button
          type="button"
          onClick={resetConversation}
          aria-label="Limpar conversa"
          className="rounded-full p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </header>

      {notifPerm === "default" && (
        <div className="flex items-center gap-3 border-b border-border bg-card/60 px-4 py-2.5">
          <span className="text-lg">🔔</span>
          <p className="flex-1 text-[12px] text-muted-foreground leading-snug">
            Ative notificações para não perder respostas da Lucia
          </p>
          <button
            type="button"
            onClick={enableNotifs}
            className="shrink-0 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-3 py-1 text-[11px] font-semibold text-white"
          >
            Ativar
          </button>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {msgs.map((m) => {
          const mine = m.from === "user";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                  mine
                    ? "bg-gradient-to-br from-pink-500 to-rose-500 text-white"
                    : "border border-border bg-card text-foreground"
                }`}
              >
                <MsgText content={m.content} />
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-border bg-card px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {!loading && (
        <div className="bg-background px-4 pt-2 pb-1">
          <div className="flex flex-wrap gap-2">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => sendContent(q.label)}
                className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground hover:border-pink-500 hover:text-pink-400 transition-colors"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-border bg-background px-3 py-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendContent(text)}
          placeholder="Escreva para a Lucia..."
          className="flex-1 rounded-full border border-border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          onClick={() => sendContent(text)}
          disabled={loading}
          className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-rose-500 text-white disabled:opacity-40 transition-opacity"
        >
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
        className="grid h-full w-full place-items-center rounded-full font-bold"
        style={{
          background: LUCIA_BOT.avatarBg,
          color: LUCIA_BOT.avatarText,
          border: `2px solid ${LUCIA_BOT.borderColor}`,
          fontSize: size * 0.4,
        }}
      >
        {LUCIA_BOT.initials}
      </div>
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
