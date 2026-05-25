import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LUCIA_BOT, getLuciaUnread } from "@/lib/lucia";
import { LuciaAvatar } from "@/routes/_authenticated/chat.lucia";


export const Route = createFileRoute("/_authenticated/_app/matches")({ component: Matches });

const FREE_MATCH_LIMIT = 5;

type MatchRow = {
  id: string;
  other: { id: string; name: string | null; photo_url: string | null };
  active: boolean;
  has_messages: boolean;
  lastMessage: string | null;
};

function Matches() {
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [luciaUnread, setLuciaUnread] = useState(0);
  const [limitOpen, setLimitOpen] = useState(false);

  useEffect(() => {
    setLuciaUnread(getLuciaUnread());
    function onHistoryChanged() { setLuciaUnread(getLuciaUnread()); }
    window.addEventListener("lucia:history-changed", onHistoryChanged);
    return () => window.removeEventListener("lucia:history-changed", onHistoryChanged);
  }, []);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data: ms } = await supabase
        .from("matches")
        .select("id,user_a,user_b,active,has_messages,created_at")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (!ms?.length) { setItems([]); setLoading(false); return; }

      const otherIds = ms.map((m) => (m.user_a === user.id ? m.user_b : m.user_a));
      const { data: profiles } = await supabase.from("profiles").select("id,name,photo_url").in("id", otherIds);
      const pmap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

      const rows: MatchRow[] = [];
      for (const m of ms) {
        const otherId = m.user_a === user.id ? m.user_b : m.user_a;
        const other = pmap.get(otherId) ?? { id: otherId, name: null, photo_url: null };
        const { data: last } = await supabase.from("messages").select("content").eq("match_id", m.id).order("created_at", { ascending: false }).limit(1);
        rows.push({ id: m.id, other, active: m.active, has_messages: m.has_messages, lastMessage: last?.[0]?.content ?? null });
      }
      setItems(rows);
      setLoading(false);
    }
    load();

    if (!user) return;
    // Realtime: notify on new mutual matches
    const channel = supabase
      .channel(`matches:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "matches" }, (payload) => {
        const m = payload.new as { user_a: string; user_b: string };
        if (m.user_a === user.id || m.user_b === user.id) {
          toast.success("É um match! Comece a conversa.", { duration: 3000 });
          load();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const activeCount = items.filter((i) => i.active).length;

  function openChat(e: React.MouseEvent, matchId: string, isActive: boolean) {
    // Free plan guard: cap at 5 active matches
    const isFree = (profile?.plan ?? "free") === "free";
    if (isFree && isActive && activeCount >= FREE_MATCH_LIMIT) {
      e.preventDefault();
      setLimitOpen(true);
      return;
    }
  }

  return (
    <div className="pt-6">
      <div className="px-6">
      <h1 className="font-display text-2xl font-bold">Matches</h1>
      <p className="mt-1 text-sm text-muted-foreground">Suas conexões na academia</p>


      <ul className="mt-6 divide-y divide-border">
        {/* Lucia bot — always pinned, frontend-only */}
        <li>
          <Link to="/chat/lucia" className="flex items-center gap-3 py-3">
            <LuciaAvatar size={56} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-display font-semibold truncate">{LUCIA_BOT.name}</p>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ background: LUCIA_BOT.avatarBg, color: LUCIA_BOT.avatarText }}
                >{LUCIA_BOT.tag}</span>
              </div>
              <p className="truncate text-sm text-green-600">{LUCIA_BOT.status}</p>
            </div>
            {luciaUnread > 0 && (
              <span className="grid h-6 min-w-6 place-items-center rounded-full bg-gradient-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                {luciaUnread}
              </span>
            )}
          </Link>
        </li>

        {loading ? (
          <li className="py-6 text-center text-muted-foreground">Carregando...</li>
        ) : items.length === 0 ? (
          <li className="py-10 text-center">
            <p className="font-display text-lg">Nenhum match ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">Continue dando like em Descobrir.</p>
          </li>
        ) : (
          items.map((m) => (
            <li key={m.id}>
              <Link
                to="/chat/$matchId"
                params={{ matchId: m.id }}
                onClick={(e) => openChat(e, m.id, m.active)}
                className="flex items-center gap-3 py-3"
              >
                <div className="h-14 w-14 overflow-hidden rounded-full bg-muted">
                  {m.other.photo_url ? <img src={m.other.photo_url} className="h-full w-full object-cover" alt="" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display font-semibold truncate">{m.other.name ?? "Membro"}</p>
                    {!m.has_messages && <span className="rounded-full bg-gradient-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">NOVO</span>}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{m.lastMessage ?? "Manda um oi 👋"}</p>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
      </div>

      {limitOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setLimitOpen(false)}>
          <div className="w-full rounded-t-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-lg font-semibold">Limite atingido</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Você atingiu o limite de 5 matches no plano gratuito.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setLimitOpen(false)}
                className="flex-1 rounded-full border border-border py-2.5 text-sm font-medium"
              >Agora não</button>
              <button
                onClick={() => { setLimitOpen(false); nav({ to: "/premium" }); }}
                className="flex-1 rounded-full bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground"
              >Ver plano Premium</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
