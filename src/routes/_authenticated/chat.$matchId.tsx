import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, Send, Flag, Ban, ImagePlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat/$matchId")({ component: Chat });

type Msg = { id: string; sender_id: string; content: string; type: string; created_at: string; deleted_for_user: boolean };

function Chat() {
  const { matchId } = useParams({ from: "/_authenticated/chat/$matchId" });
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [other, setOther] = useState<{ id: string; name: string | null; photo_url: string | null } | null>(null);
  const [matchActive, setMatchActive] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: m } = await supabase.from("matches").select("user_a,user_b,active").eq("id", matchId).maybeSingle();
      if (!m) { toast.error("Match não encontrado"); nav({ to: "/matches" }); return; }
      setMatchActive(m.active);
      const otherId = m.user_a === user.id ? m.user_b : m.user_a;
      const { data: o } = await supabase.from("profiles").select("id,name,photo_url").eq("id", otherId).maybeSingle();
      setOther(o);
      const { data: list } = await supabase.from("messages").select("*").eq("match_id", matchId).order("created_at");
      setMsgs((list ?? []) as Msg[]);
    })();
    const channel = supabase
      .channel(`chat:${matchId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => setMsgs((prev) => [...prev, payload.new as Msg]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId, user, nav]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send() {
    if (!user || !text.trim()) return;
    const content = text.trim();
    setText("");
    const { error } = await supabase.from("messages").insert({ match_id: matchId, sender_id: user.id, content, type: "text" });
    if (error) toast.error(error.message);
  }

  async function sendImage(file: File) {
    if (!user) return;
    if (profile?.plan !== "gold" && profile?.plan !== "diamond") { toast.error("Envio de imagens é exclusivo para Gold e Diamond"); return; }
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${matchId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("chat-media").upload(path, file);
    if (upErr) return toast.error(upErr.message);
    const { data } = supabase.storage.from("chat-media").createSignedUrl ? await supabase.storage.from("chat-media").createSignedUrl(path, 60 * 60 * 24 * 365) : { data: null };
    const url = data?.signedUrl ?? path;
    await supabase.from("messages").insert({ match_id: matchId, sender_id: user.id, content: url, type: "image" });
  }

  async function report(reason: "harassment"|"fake_profile"|"offensive_language"|"spam"|"inappropriate_behavior"|"racism") {
    if (!user || !other) return;
    const { error } = await supabase.from("reports").insert({ reporter_id: user.id, reported_id: other.id, reason });
    if (error) return toast.error(error.message);
    await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: other.id });
    await supabase.from("matches").update({ active: false }).eq("id", matchId);
    toast.success("Denúncia enviada. O usuário foi bloqueado.");
    nav({ to: "/matches" });
  }

  async function block() {
    if (!user || !other) return;
    await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: other.id });
    await supabase.from("matches").update({ active: false }).eq("id", matchId);
    toast.success("Bloqueado");
    nav({ to: "/matches" });
  }

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button onClick={() => nav({ to: "/matches" })}><ArrowLeft className="h-5 w-5" /></button>
        <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">
          {other?.photo_url && <img src={other.photo_url} className="h-full w-full object-cover" alt="" />}
        </div>
        <div className="flex-1">
          <p className="font-display font-semibold leading-tight">{other?.name ?? "Membro"}</p>
          {!matchActive && <p className="text-xs text-destructive">Match inativo</p>}
        </div>
        <button onClick={() => setShowMenu((s) => !s)} className="rounded-full p-2 hover:bg-accent">⋯</button>
      </header>
      {showMenu && (
        <div className="border-b border-border bg-card px-4 py-2 text-sm">
          <button onClick={() => report("harassment")} className="flex w-full items-center gap-2 py-2"><Flag className="h-4 w-4" /> Denunciar assédio</button>
          <button onClick={() => report("fake_profile")} className="flex w-full items-center gap-2 py-2"><Flag className="h-4 w-4" /> Denunciar perfil falso</button>
          <button onClick={() => report("inappropriate_behavior")} className="flex w-full items-center gap-2 py-2"><Flag className="h-4 w-4" /> Denunciar comportamento inadequado</button>
          <button onClick={block} className="flex w-full items-center gap-2 py-2 text-destructive"><Ban className="h-4 w-4" /> Bloquear</button>
        </div>
      )}
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        <p className="py-2 text-center text-[12px] text-muted-foreground">
          Vocês fizeram match! Comece a conversa.
        </p>
        {msgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="relative h-16 w-24">
              <div className="absolute left-0 top-0 grid h-16 w-16 place-items-center rounded-full bg-muted font-display text-xl font-semibold">
                {(profile?.name ?? "Eu").slice(0, 2).toUpperCase()}
              </div>
              <div className="absolute right-0 top-0 grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-accent font-display text-xl font-semibold">
                {other?.photo_url
                  ? <img src={other.photo_url} className="h-full w-full object-cover" alt="" />
                  : (other?.name ?? "M").slice(0, 2).toUpperCase()}
              </div>
            </div>
            <p className="mt-4 text-[13px] text-muted-foreground">Nenhuma mensagem ainda. Diga olá!</p>
          </div>
        ) : msgs.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${mine ? "bg-gradient-primary text-primary-foreground" : "bg-card border border-border"}`}>
                {m.type === "image" ? <img src={m.content} className="rounded-lg" alt="" /> : <p className="text-sm">{m.content}</p>}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {matchActive && (
        <div className="flex items-center gap-2 border-t border-border bg-background px-3 py-2 safe-bottom">
          <label className="cursor-pointer rounded-full p-2 hover:bg-accent">
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && sendImage(e.target.files[0])} />
          </label>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Mensagem..."
            className="flex-1 rounded-full border border-border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={send} className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-primary-foreground"><Send className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}
